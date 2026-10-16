import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  isValidTelegramWebhookSecret,
  sendTelegramApprovalRequest,
  updateTelegramApprovalMessage
} from '../src/server/telegramApproval';

async function main() {
  assert.equal(isValidTelegramWebhookSecret('secret_123', 'secret_123'), true);
  assert.equal(isValidTelegramWebhookSecret('wrong', 'secret_123'), false);
  assert.equal(isValidTelegramWebhookSecret(undefined, 'secret_123'), false);

  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; body: unknown }> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    let body: unknown = init?.body;
    if (typeof init?.body === 'string') body = JSON.parse(init.body);
    calls.push({ url, body });
    return new Response(JSON.stringify({ ok: true, result: { message_id: 45 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }) as typeof fetch;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'telegram-approval-test-'));
  const videoPath = path.join(tempDir, 'short.mp4');
  await fs.writeFile(videoPath, Buffer.alloc(2048));
  try {
    const result = await sendTelegramApprovalRequest({
      botToken: 'test-token',
      chatId: '123',
      jobId: 'job_123_abc',
      title: '<Newsy & tytuł>',
      videoPath,
      sourceUrl: 'https://www.bankier.pl/wiadomosc/test'
    });
    assert.equal(result.message_id, 45);
    assert.equal(calls[0].url, 'https://api.telegram.org/bottest-token/sendVideo');
    assert.ok(calls[0].body instanceof FormData);
    const form = calls[0].body as FormData;
    assert.equal(form.get('chat_id'), '123');
    assert.equal(form.get('parse_mode'), 'HTML');
    assert.match(String(form.get('caption')), /&lt;Newsy &amp; tytuł&gt;/);
    assert.match(String(form.get('caption')), /Źródło: Bankier\.pl/);
    const video = form.get('video') as File;
    assert.equal(video.name, 'short.mp4');
    assert.equal(video.type, 'video/mp4');
    const keyboard = JSON.parse(String(form.get('reply_markup')));
    assert.equal(keyboard.inline_keyboard[0][0].callback_data, 'shortapproval:approve:job_123_abc');
    assert.equal(keyboard.inline_keyboard[0][1].callback_data, 'shortapproval:reject:job_123_abc');

    await updateTelegramApprovalMessage('test-token', '123', 45, 'Tytuł shorta', 'approved');
    assert.equal(calls[1].url, 'https://api.telegram.org/bottest-token/editMessageCaption');
    const update = calls[1].body as Record<string, any>;
    assert.match(update.caption, /ZATWIERDZONO/);
    assert.match(update.caption, /Film nie został opublikowany/);
    assert.deepEqual(update.reply_markup, { inline_keyboard: [] });
  } finally {
    globalThis.fetch = originalFetch;
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  console.log('telegramApproval tests passed');
}

void main();
