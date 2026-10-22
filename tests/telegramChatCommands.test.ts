import assert from 'node:assert/strict';
import { classifyTelegramChatMessage } from '../src/server/telegramChatCommands';

assert.deepEqual(classifyTelegramChatMessage('/start'), { action: 'start', text: '' });
assert.deepEqual(classifyTelegramChatMessage('/start@mojshortscreatorbot'), { action: 'start', text: '' });
assert.deepEqual(classifyTelegramChatMessage('/pomoc'), { action: 'help', text: '' });
assert.deepEqual(classifyTelegramChatMessage('/ustawienia'), { action: 'settings', text: '' });
assert.deepEqual(classifyTelegramChatMessage('/presety'), { action: 'presets', text: '' });
assert.deepEqual(classifyTelegramChatMessage('/generuj temat shorta'), { action: 'new_video', text: 'temat shorta' });
assert.deepEqual(classifyTelegramChatMessage('🎬 Nowe Video (Mów/Pisz)'), { action: 'new_video', text: '' });
assert.deepEqual(classifyTelegramChatMessage('Nowe Wideo (Mów/Pisz)'), { action: 'new_video', text: '' });
assert.deepEqual(classifyTelegramChatMessage('⚙️ Moje Ustawienia'), { action: 'settings', text: '' });
assert.deepEqual(classifyTelegramChatMessage('Cześć, czy działa?'), { action: 'message', text: 'Cześć, czy działa?' });

console.log('Telegram chat command tests passed');
