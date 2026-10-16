import { timingSafeEqual } from 'node:crypto';

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
  outputUrl: string;
  sourceUrl?: string;
}

export interface TelegramSentMessage {
  message_id: number;
}

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

async function telegramApi<T>(botToken: string, method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000)
  });
  const data = await response.json() as TelegramApiResponse<T>;
  if (!response.ok || !data.ok || !data.result) {
    throw new Error(data.description || `Telegram API ${method} zwróciło HTTP ${response.status}.`);
  }
  return data.result;
}

export async function sendTelegramApprovalRequest(input: TelegramApprovalRequest): Promise<TelegramSentMessage> {
  if (!/^https:\/\//i.test(input.outputUrl)) {
    throw new Error('Telegram wymaga publicznego adresu HTTPS do podglądu MP4. Ustaw APP_URL na publiczny adres aplikacji.');
  }

  const title = escapeHtml(input.title.slice(0, 240));
  const sourceLine = input.sourceUrl && isBankierUrl(input.sourceUrl)
    ? `\n<a href="${escapeHtml(input.sourceUrl)}">Źródło: Bankier.pl</a>`
    : '';
  const text = `🎬 <b>Short gotowy do akceptacji</b>\n${title}${sourceLine}\n\nObejrzyj MP4, a następnie wybierz decyzję. Akceptacja nie publikuje filmu.`;
  return telegramApi<TelegramSentMessage>(input.botToken, 'sendMessage', {
    chat_id: input.chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
    reply_markup: {
      inline_keyboard: [
        [{ text: '▶️ Otwórz MP4', url: input.outputUrl }],
        [
          { text: '✅ Akceptuję', callback_data: `shortapproval:approve:${input.jobId}` },
          { text: '✖️ Odrzucam', callback_data: `shortapproval:reject:${input.jobId}` }
        ]
      ]
    }
  });
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
  outputUrl: string,
  decision: 'approved' | 'rejected'
): Promise<void> {
  const label = decision === 'approved' ? 'ZATWIERDZONO' : 'ODRZUCONO';
  const text = `🎬 <b>Short — ${label}</b>\n${escapeHtml(title.slice(0, 240))}\n<a href="${escapeHtml(outputUrl)}">Otwórz MP4</a>\n\nFilm nie został opublikowany.`;
  await telegramApi<{ message_id: number }>(botToken, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
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
