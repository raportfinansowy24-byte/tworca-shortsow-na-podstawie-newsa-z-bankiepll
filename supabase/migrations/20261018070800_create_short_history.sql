-- Apply this migration in the Supabase SQL Editor or with the Supabase CLI.
-- The app accesses these tables only from its server using a service-role key.

create table if not exists public.short_jobs (
  id text primary key,
  source text not null default 'unknown',
  status text not null check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  progress smallint not null default 0 check (progress between 0 and 100),
  step text,
  error text,
  title text,
  article_title text,
  article_url text,
  article_category text,
  scenes jsonb not null default '[]'::jsonb,
  short_metadata jsonb not null default '{}'::jsonb,
  output_url text,
  output_filename text,
  thumbnail_url text,
  thumbnail_filename text,
  duration_seconds double precision,
  file_size_bytes bigint,
  export_status text not null default 'not_started'
    check (export_status in ('not_started', 'uploading', 'completed', 'failed')),
  drive_file_id text,
  drive_web_view_link text,
  drive_file_name text,
  export_error text,
  telegram_approval_status text,
  telegram_message_id bigint,
  telegram_comment_prompt_message_id bigint,
  telegram_feedback text,
  parent_job_id text,
  revision_number integer not null default 0,
  revision_job_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists short_jobs_updated_at_idx
  on public.short_jobs (updated_at desc);
create index if not exists short_jobs_status_updated_at_idx
  on public.short_jobs (status, updated_at desc);
create index if not exists short_jobs_export_status_updated_at_idx
  on public.short_jobs (export_status, updated_at desc);

create index if not exists short_jobs_parent_revision_idx
  on public.short_jobs (parent_job_id, revision_number desc)
  where parent_job_id is not null;

create table if not exists public.short_job_exports (
  id uuid primary key,
  job_id text not null references public.short_jobs(id) on delete cascade,
  provider text not null check (provider in ('google_drive')),
  status text not null check (status in ('uploading', 'completed', 'failed')),
  drive_file_id text,
  drive_web_view_link text,
  drive_file_name text,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists short_job_exports_job_updated_idx
  on public.short_job_exports (job_id, updated_at desc);

alter table public.short_jobs enable row level security;
alter table public.short_job_exports enable row level security;

revoke all on table public.short_jobs from anon, authenticated;
revoke all on table public.short_job_exports from anon, authenticated;
grant all on table public.short_jobs to service_role;
grant all on table public.short_job_exports to service_role;
