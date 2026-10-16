import { timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export interface TelegramApprovalRequest {
  botToken: string;
  chatId: string;
  jobId: string;
  title: string;
  videoPath: string;
  sourceUrl?: string;
}

export interface TelegramSentMessage {
  message_id: number;
}

const MAX_TELEGRAM_VIDEO_BYTES = 45 * 1024 * 1024;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character] || character);
}

function isBankierUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === 'https:' && (hostname === 'bankier.pl' || hostname.endsWith('.bankier.pl'));
  } catch {
    return false;
  }
}

async function parseTelegramResponse<T>(response: Response, method: string): Promise<T> {
  let data: TelegramApiResponse<T>;
  try {
    data = await response.json() as TelegramApiResponse<T>;
  } catch {
    throw new Error(`Telegram API ${method} zwróciło nieprawidłową odpowiedź.`);
  }
  if (!response.ok || !data.ok || data.result === undefined || data.result === null) {
    throw new Error(data.description || `Telegram API ${method} zwróciło HTTP ${response.status}.`);
  }
  return data.result;
}

async function telegramApi<T>(botToken: string, method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000)
  });
  return parseTelegramResponse<T>(response, method);
}

export async function sendTelegramApprovalRequest(input: TelegramApprovalRequest): Promise<TelegramSentMessage> {
  if (!input.videoPath.toLowerCase().endsWith('.mp4')) {
    throw new Error('Do akceptacji Telegram można wysłać tylko plik MP4.');
  }
  const stats = await fs.stat(input.videoPath);
  if (!stats.isFile() || stats.size < 1024) {
    throw new Error('Gotowy plik MP4 nie istnieje albo jest pusty.');
  }
  if (stats.size > MAX_TELEGRAM_VIDEO_BYTES) {
    throw new Error('MP4 przekracza limit 45 MB dla załącznika Telegram.');
  }

  const title = escapeHtml(input.title.slice(0, 240));
  const sourceLine = input.sourceUrl && isBankierUrl(input.sourceUrl)
    ? `\n<a href="${escapeHtml(input.sourceUrl)}">Źródło: Bankier.pl</a>`
    : '';
  const caption = `🎬 <b>Short gotowy do akceptacji</b>\n${title}${sourceLine}\n\nObejrzyj załączone MP4, a następnie wybierz decyzję. Akceptacja nie publikuje filmu.`;
  const keyboard = {
    inline_keyboard: [[
      { text: '✅ Akceptuję', callback_data: `shortapproval:approve:${input.jobId}` },
      { text: '✖️ Odrzucam', callback_data: `shortapproval:reject:${input.jobId}` }
    ]]
  };
  const form = new FormData();
  form.set('chat_id', input.chatId);
  form.set('video', new Blob([await fs.readFile(input.videoPath)], { type: 'video/mp4' }), path.basename(input.videoPath));
  form.set('caption', caption);
  form.set('parse_mode', 'HTML');
  form.set('supports_streaming', 'true');
  form.set('reply_markup', JSON.stringify(keyboard));

  const response = await fetch(`https://api.telegram.org/bot${input.botToken}/sendVideo`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(120_000)
  });
  return parseTelegramResponse<TelegramSentMessage>(response, 'sendVideo');
}

export async function answerTelegramCallback(
  botToken: string,
  callbackQueryId: string,
  text: string
): Promise<void> {
  await telegramApi<{ ok: boolean }>(botToken, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text.slice(0, 190),
    show_alert: false
  });
}

export async function updateTelegramApprovalMessage(
  botToken: string,
  chatId: string,
  messageId: number,
  title: string,
  decision: 'approved' | 'rejected'
): Promise<void> {
  const label = decision === 'approved' ? 'ZATWIERDZONO' : 'ODRZUCONO';
  const caption = `🎬 <b>Short — ${label}</b>\n${escapeHtml(title.slice(0, 240))}\n\nFilm nie został opublikowany.`;
  await telegramApi<{ message_id: number }>(botToken, 'editMessageCaption', {
    chat_id: chatId,
    message_id: messageId,
    caption,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [] }
  });
}

export async function registerTelegramWebhook(
  botToken: string,
  appUrl: string,
  webhookSecret: string
): Promise<void> {
  const base = appUrl.trim().replace(/\/+$/, '');
  if (!/^https:\/\//i.test(base)) {
    throw new Error('APP_URL musi być publicznym adresem HTTPS, aby Telegram mógł wysyłać callbacki.');
  }
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(webhookSecret)) {
    throw new Error('TELEGRAM_WEBHOOK_SECRET musi zawierać 1–256 znaków: litery, cyfry, _ lub -.');
  }
  await telegramApi<{ url: string }>(botToken, 'setWebhook', {
    url: `${base}/api/telegram/webhook`,
    secret_token: webhookSecret,
    allowed_updates: ['callback_query']
  });
}

export function isValidTelegramWebhookSecret(received: string | undefined, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
