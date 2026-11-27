-- Durable deletion for render-job history.
-- Tombstones prevent delayed queue flushes or old local snapshots from recreating a deleted job.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.short_job_deletions (
  job_id text primary key,
  deleted_at timestamptz not null default now()
);

alter table private.short_job_deletions enable row level security;
revoke all on table private.short_job_deletions from public, anon, authenticated;
grant select, insert, update, delete on table private.short_job_deletions to service_role;

create or replace function public.prevent_deleted_short_job_resurrection()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from private.short_job_deletions
    where job_id = new.id
  ) then
    return null;
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_deleted_short_job_resurrection() from public, anon, authenticated;
grant execute on function public.prevent_deleted_short_job_resurrection() to service_role;

drop trigger if exists short_jobs_prevent_deleted_resurrection on public.short_jobs;
create trigger short_jobs_prevent_deleted_resurrection
before insert or update on public.short_jobs
for each row
execute function public.prevent_deleted_short_job_resurrection();

create or replace function public.delete_short_jobs(
  p_job_ids text[] default array[]::text[],
  p_terminal_only boolean default false,
  p_all boolean default false
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  target_ids text[];
begin
  select coalesce(array_agg(distinct targets.job_id), array[]::text[])
  into target_ids
  from (
    select unnest(coalesce(p_job_ids, array[]::text[])) as job_id
    union
    select id as job_id
    from public.short_jobs
    where p_all
       or (p_terminal_only and status in ('completed', 'failed'))
  ) as targets
  where nullif(btrim(targets.job_id), '') is not null;

  if cardinality(target_ids) = 0 then
    return 0;
  end if;

  insert into private.short_job_deletions (job_id, deleted_at)
  select unnest(target_ids), now()
  on conflict (job_id) do update
    set deleted_at = excluded.deleted_at;

  -- Export metadata references short_jobs without ON DELETE CASCADE.
  -- Remove those rows first; this does not delete files stored in Google Drive.
  delete from public.short_job_exports
  where job_id = any(target_ids);

  delete from public.short_jobs
  where id = any(target_ids);

  return cardinality(target_ids);
end;
$$;

revoke all on function public.delete_short_jobs(text[], boolean, boolean) from public, anon, authenticated;
grant execute on function public.delete_short_jobs(text[], boolean, boolean) to service_role;

create or replace function public.get_deleted_short_job_ids(p_job_ids text[])
returns text[]
language sql
stable
set search_path = ''
as $$
  select coalesce(array_agg(deletions.job_id), array[]::text[])
  from private.short_job_deletions as deletions
  where deletions.job_id = any(coalesce(p_job_ids, array[]::text[]));
$$;

revoke all on function public.get_deleted_short_job_ids(text[]) from public, anon, authenticated;
grant execute on function public.get_deleted_short_job_ids(text[]) to service_role;
