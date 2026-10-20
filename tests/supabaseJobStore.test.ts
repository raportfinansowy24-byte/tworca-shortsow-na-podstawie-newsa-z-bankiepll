import assert from 'node:assert/strict';
import { rowToShortJobSnapshot, toSupabaseJobRow, type ShortJobSnapshot } from '../src/server/supabaseJobStore';

const snapshot: ShortJobSnapshot = {
  id: 'job_auto_12345_ab12c',
  source: 'scheduler',
  status: 'completed',
  progress: 100,
  step: 'Renderowanie zakończone',
  title: 'Przykładowy short',
  articleTitle: 'Bankier news',
  articleUrl: 'https://www.bankier.pl/wiadomosc/example.html',
  articleCategory: 'Wiadomości',
  scenes: [{ index: 1, source: 'pexels', pexelsId: 123 }],
  shortMetadata: { sceneCount: 1, ttsVoice: 'voice-test' },
  outputUrl: 'https://example.test/exports/short.mp4',
  outputFilename: 'short.mp4',
  thumbnailUrl: 'https://example.test/exports/thumb.jpg',
  duration: 18,
  fileSize: 1024,
  exportStatus: 'completed',
  driveFileId: 'drive-file-1',
  driveUrl: 'https://drive.google.com/file/d/drive-file-1/view',
  driveFileName: 'short.mp4',
  telegramApprovalStatus: 'rework_created',
  telegramApprovalMessageId: 881,
  telegramCommentPromptMessageId: 882,
  telegramFeedback: 'Popraw hook i kontrast napisów',
  parentJobId: 'job_auto_12345_ab12c',
  revisionNumber: 2,
  revisionJobId: 'job_revision_54321_xy98z',
  createdAt: '2026-10-18T05:00:00.000Z',
  updatedAt: '2026-10-18T05:01:00.000Z'
};

const row = toSupabaseJobRow(snapshot);
assert.equal(row.id, snapshot.id);
assert.equal(row.source, 'scheduler');
assert.equal(row.status, 'completed');
assert.equal(row.article_url, snapshot.articleUrl);
assert.deepEqual(row.scenes, snapshot.scenes);
assert.deepEqual(row.short_metadata, snapshot.shortMetadata);
assert.equal(row.duration_seconds, 18);
assert.equal(row.file_size_bytes, 1024);
assert.equal(row.export_status, 'completed');
assert.equal(row.drive_web_view_link, snapshot.driveUrl);
assert.equal(row.telegram_approval_status, snapshot.telegramApprovalStatus);
assert.equal(row.telegram_message_id, snapshot.telegramApprovalMessageId);
assert.equal(row.telegram_comment_prompt_message_id, snapshot.telegramCommentPromptMessageId);
assert.equal(row.telegram_feedback, snapshot.telegramFeedback);
assert.equal(row.parent_job_id, snapshot.parentJobId);
assert.equal(row.revision_number, snapshot.revisionNumber);
assert.equal(row.revision_job_id, snapshot.revisionJobId);
assert.equal(row.created_at, snapshot.createdAt);

const roundTrip = rowToShortJobSnapshot(row);
assert.equal(roundTrip.id, snapshot.id);
assert.equal(roundTrip.status, snapshot.status);
assert.equal(roundTrip.title, snapshot.title);
assert.equal(roundTrip.articleTitle, snapshot.articleTitle);
assert.deepEqual(roundTrip.scenes, snapshot.scenes);
assert.deepEqual(roundTrip.shortMetadata, snapshot.shortMetadata);
assert.equal(roundTrip.exportStatus, 'completed');
assert.equal(roundTrip.driveFileId, snapshot.driveFileId);
assert.equal(roundTrip.driveUrl, snapshot.driveUrl);
assert.equal(roundTrip.telegramApprovalStatus, snapshot.telegramApprovalStatus);
assert.equal(roundTrip.telegramApprovalMessageId, snapshot.telegramApprovalMessageId);
assert.equal(roundTrip.telegramCommentPromptMessageId, snapshot.telegramCommentPromptMessageId);
assert.equal(roundTrip.telegramFeedback, snapshot.telegramFeedback);
assert.equal(roundTrip.parentJobId, snapshot.parentJobId);
assert.equal(roundTrip.revisionNumber, snapshot.revisionNumber);
assert.equal(roundTrip.revisionJobId, snapshot.revisionJobId);
assert.equal(roundTrip.duration, snapshot.duration);
assert.equal(roundTrip.fileSize, snapshot.fileSize);

const minimal = toSupabaseJobRow({
  id: 'job_minimal',
  status: 'queued',
  progress: 0,
  createdAt: snapshot.createdAt,
  updatedAt: snapshot.createdAt
});
assert.equal(minimal.export_status, 'not_started');
assert.deepEqual(minimal.scenes, []);
assert.deepEqual(minimal.short_metadata, {});
assert.equal(minimal.drive_web_view_link, null);

console.log('Supabase job history mapper tests passed');
