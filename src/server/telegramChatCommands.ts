export type TelegramChatAction = 'start' | 'help' | 'settings' | 'presets' | 'new_video' | 'message';

export interface ParsedTelegramChatMessage {
  action: TelegramChatAction;
  text: string;
}

function normalizeTelegramLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ł/gi, 'l')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, ' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s/@()_-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyTelegramChatMessage(value: string): ParsedTelegramChatMessage {
  const text = value.trim();
  if (!text) return { action: 'message', text: '' };

  const firstToken = text.split(/\s+/, 1)[0].toLowerCase().split('@', 1)[0];
  const remainder = text.slice(text.split(/\s+/, 1)[0].length).trim();
  const commands: Record<string, TelegramChatAction> = {
    '/start': 'start',
    '/pomoc': 'help',
    '/help': 'help',
    '/ustawienia': 'settings',
    '/settings': 'settings',
    '/presety': 'presets',
    '/generuj': 'new_video'
  };
  const commandAction = commands[firstToken];
  if (commandAction) return { action: commandAction, text: remainder };

  const label = normalizeTelegramLabel(text);
  if (/^nowe (wideo|video)( \(mow\s*\/\s*pisz\))?$/.test(label)) {
    return { action: 'new_video', text: '' };
  }
  if (label === 'moje ustawienia') return { action: 'settings', text: '' };
  if (label === 'pomoc') return { action: 'help', text: '' };

  return { action: 'message', text };
}
