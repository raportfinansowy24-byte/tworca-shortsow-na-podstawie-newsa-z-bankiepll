import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://job-delete-test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_job_delete_test';

const requests: Array<{ url: string; method: string; body: string }> = [];
let failNextDelete = false;
let failNextTombstoneLookup = false;

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  const method = String(init?.method || 'GET').toUpperCase();
  const body = typeof init?.body === 'string' ? init.body : '';
  requests.push({ url, method, body });

  if (url.includes('/rpc/delete_short_jobs')) {
    if (failNextDelete) {
      failNextDelete = false;
      return new Response(JSON.stringify({ code: 'TEST_FAILURE', message: 'forced delete failure' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response('2', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (url.includes('/rpc/get_deleted_short_job_ids')) {
    if (failNextTombstoneLookup) {
      failNextTombstoneLookup = false;
      return new Response(JSON.stringify({ code: 'TEST_LOOKUP_FAILURE', message: 'forced tombstone lookup failure' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify(['persistently-deleted', 'job_disk_old']), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (url.includes('/short_jobs') && method === 'POST') {
    return new Response('', { status: 201 });
  }

  if (url.includes('/short_jobs') && method === 'GET') {
    return new Response(JSON.stringify([
      { id: 'persistently-deleted', status: 'completed', progress: 100, created_at: '2026-11-27T00:00:00.000Z', updated_at: '2026-11-27T00:01:00.000Z' },
      { id: 'still-visible', status: 'completed', progress: 100, created_at: '2026-11-27T00:00:00.000Z', updated_at: '2026-11-27T00:01:00.000Z' }
    ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  throw new Error('Unexpected Supabase test request: ' + method + ' ' + url);
}) as typeof fetch;

try {
  const store = await import('../src/server/supabaseJobStore');

  const deleted = await store.deleteShortJobsFromSupabase(['job-old-1', 'job-old-2'], {
    terminalOnly: true
  });
  assert.equal(deleted, true, 'successful Supabase delete should be acknowledged');

  const deleteRequest = requests.find((request) => request.url.includes('/rpc/delete_short_jobs'));
  assert.ok(deleteRequest, 'history delete must use the transactional Supabase RPC');
  assert.deepEqual(JSON.parse(deleteRequest.body), {
    p_job_ids: ['job-old-1', 'job-old-2'],
    p_terminal_only: true,
    p_all: false
  });

  const requestCountAfterDelete = requests.length;
  store.queueShortJobSnapshot({
    id: 'job-old-1',
    status: 'completed',
    progress: 100,
    createdAt: '2026-11-27T00:00:00.000Z',
    updatedAt: '2026-11-27T00:01:00.000Z'
  });
  assert.equal(
    await store.persistShortJobSnapshot({
      id: 'job-old-1',
      status: 'completed',
      progress: 100,
      createdAt: '2026-11-27T00:00:00.000Z',
      updatedAt: '2026-11-27T00:01:00.000Z'
    }),
    false,
    'a deleted job must not be re-queued for persistence'
  );
  assert.equal(requests.length, requestCountAfterDelete, 'deleted jobs must not be upserted again');

  const loaded = await store.loadShortJobsFromSupabase(20);
  assert.deepEqual(loaded.map((job) => job.id), ['still-visible'], 'tombstoned rows must be filtered from history');

  const recoveredCandidates = await store.getDeletedShortJobIds([
    'job_disk_old',
    'job_never_deleted'
  ]);
  assert.equal(recoveredCandidates.has('job_disk_old'), true, 'MP4 recovery must recognize a tombstoned disk-recovered job ID');
  assert.equal(recoveredCandidates.has('job_never_deleted'), false, 'MP4 recovery must preserve non-deleted exports');

  failNextTombstoneLookup = true;
  await assert.rejects(
    () => store.getDeletedShortJobIds(['job_disk_old']),
    /Nie udało się sprawdzić trwałych usunięć/,
    'recovery must fail closed when Supabase tombstone lookup fails'
  );

  failNextDelete = true;
  assert.equal(
    await store.deleteShortJobsFromSupabase(['job-retry-after-failure']),
    false,
    'failed delete must be surfaced'
  );
  assert.equal(
    await store.persistShortJobSnapshot({
      id: 'job-retry-after-failure',
      status: 'completed',
      progress: 100,
      createdAt: '2026-11-27T00:00:00.000Z',
      updatedAt: '2026-11-27T00:01:00.000Z'
    }),
    true,
    'failed delete must release the in-memory guard so normal persistence can recover'
  );
  assert.ok(
    requests.some((request) => request.url.includes('/short_jobs') && request.method === 'POST'),
    'a job whose delete failed must remain eligible for persistence'
  );
} finally {
  globalThis.fetch = originalFetch;
}

console.log('Persistent Supabase job deletion tests passed.');
