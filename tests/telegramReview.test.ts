import assert from 'node:assert/strict';
import { isTelegramApproverAuthorized, isValidTelegramWebhookSecret } from '../src/server/telegramApproval';
import { MAX_TELEGRAM_REVISIONS, normalizeTelegramFeedback, nextTelegramRevisionNumber } from '../src/server/telegramRevision';

assert.equal(isTelegramApproverAuthorized('123456', '123456', '123456'), true, 'private chat is bound to its own Telegram user');
assert.equal(isTelegramApproverAuthorized('123456', '123456', '654321'), false, 'a second private account cannot approve the configured chat');
assert.equal(isTelegramApproverAuthorized('-100123', '-100123', '654321'), false, 'group chat requires explicit approver ID');
assert.equal(isTelegramApproverAuthorized('-100123', '-100123', '654321', '654321'), true, 'group approver ID grants the selected account access');
assert.equal(isTelegramApproverAuthorized('-100123', '-100999', '654321', '654321'), false, 'group ID must also match');
assert.equal(isValidTelegramWebhookSecret('correct-secret', 'correct-secret'), true);
assert.equal(isValidTelegramWebhookSecret('wrong-secret', 'correct-secret'), false);

assert.equal(normalizeTelegramFeedback('  Zmień hook i popraw czytelność.  '), 'Zmień hook i popraw czytelność.');
assert.equal(normalizeTelegramFeedback('   '), null, 'empty comments are rejected');
assert.equal(normalizeTelegramFeedback('x'.repeat(1801)), null, 'overlong comments are rejected');
assert.equal(nextTelegramRevisionNumber(0), 1);
assert.equal(nextTelegramRevisionNumber(4), 5);
assert.equal(nextTelegramRevisionNumber(MAX_TELEGRAM_REVISIONS), null, 'revision limit prevents infinite loops');

console.log('Telegram review workflow tests passed');
