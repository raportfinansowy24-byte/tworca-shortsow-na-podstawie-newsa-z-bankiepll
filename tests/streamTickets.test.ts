import assert from 'node:assert/strict';
import { createStreamTicketStore } from '../src/server/streamTickets';

let now = 1_800_000_000_000;
const store = createStreamTicketStore({ ttlMs: 60_000, maxEntries: 3, now: () => now });

const first = store.issue('job-1');
assert.match(first, /^[A-Za-z0-9_-]{40,}$/);
assert.equal(store.size(), 1);
assert.equal(store.consume('job-other', first), false, 'a ticket cannot authorize a different job');
assert.equal(store.size(), 0, 'a ticket presented for the wrong job is consumed');

const second = store.issue('job-2');
assert.equal(store.consume('job-2', second), true);
assert.equal(store.consume('job-2', second), false, 'stream tickets are one-use');

const expired = store.issue('job-expired');
now += 60_001;
assert.equal(store.consume('job-expired', expired), false, 'expired tickets are rejected');
assert.equal(store.prune(), 0, 'consuming an expired ticket already removes it');

const a = store.issue('job-a');
const b = store.issue('job-b');
const c = store.issue('job-c');
const fourth = store.issue('job-d');
assert.equal(store.size(), 3, 'the ticket map stays within the configured capacity');
assert.equal(store.consume('job-a', a), false, 'the oldest ticket is evicted at capacity');
assert.equal(store.consume('job-b', b), true);
assert.equal(store.consume('job-c', c), true);
assert.equal(store.consume('job-d', fourth), true);

store.issue('job-expiring');
store.issue('job-later');
now += 60_001;
assert.equal(store.prune(), 2, 'expired, abandoned tickets are removed proactively');
assert.equal(store.size(), 0);

console.log('Stream ticket store tests passed');
