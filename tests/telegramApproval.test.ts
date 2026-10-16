import assert from 'node:assert/strict';
import {
  isValidTelegramWebhookSecret,
  sendTelegramApprovalRequest
} from '../src/server/telegramApproval';

async function main() {
  assert.equal(isValidTelegramWebhookSecret('secret_123', 'secret_123'), true);
  assert.equal(isValidTelegramWebhookSecret('wrong', 'secret_123'), false);
  assert.equal(isValidTelegramWebhookSecret(undefined, 'secret_123'), false);

  const originalFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedBody: any = null;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ ok: true, result: { message_id: 45 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }) as typeof fetch;

  try {
    const result = await sendTelegramApprovalRequest({
      botToken: 'test-token',
      chatId: '123',
      jobId: 'job_123_abc',
      title: '<Newsy & tytuł>',
      outputUrl: 'https://app.example/exports/short.mp4',
      sourceUrl: 'https://www.bankier.pl/wiadomosc/test'
    });
    assert.equal(result.message_id, 45);
    assert.equal(capturedUrl, 'https://api.telegram.org/bottest-token/sendMessage');
    assert.match(capturedBody.text, /&lt;Newsy &amp; tytuł&gt;/);
    assert.match(capturedBody.text, /Źródło: Bankier\.pl/);
    assert.equal(capturedBody.reply_markup.inline_keyboard[1][0].callback_data, 'shortapproval:approve:job_123_abc');
    assert.equal(capturedBody.reply_markup.inline_keyboard[1][1].callback_data, 'shortapproval:reject:job_123_abc');
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log('telegramApproval tests passed');
}

void main();
