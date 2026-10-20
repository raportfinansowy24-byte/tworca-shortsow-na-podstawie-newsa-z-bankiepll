-- Additive upgrade for projects that already applied the initial short-history migration.
-- The initial migration also contains these columns for fresh installations.
alter table public.short_jobs
  add column if not exists telegram_comment_prompt_message_id bigint,
  add column if not exists telegram_feedback text,
  add column if not exists parent_job_id text,
  add column if not exists revision_number integer not null default 0,
  add column if not exists revision_job_id text;

create index if not exists short_jobs_parent_revision_idx
  on public.short_jobs (parent_job_id, revision_number desc)
  where parent_job_id is not null;

-- Drive upload retries are deduplicated by the server-side in-flight reservation and
-- the stable bankierShortJobId appProperty stored on each uploaded Drive file. This
-- additive schema migration deliberately does not rewrite historical export attempts.
