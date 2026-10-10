-- End instants use San Antonio's zone, including daylight saving transitions.
-- An event without an end time remains public through its whole final day.
alter table public.local_events add column ends_at timestamptz generated always as (
  (case when end_time is null then (end_date + 1)::timestamp
        else end_date + end_time end) at time zone 'America/Chicago'
) stored;

create index local_events_ends_at_idx on public.local_events(ends_at)
  where status in ('published','cancelled');

-- Hide ended events immediately, including the brief interval before Cron runs.
alter policy local_events_public_read on public.local_events
  using (status in ('published','cancelled') and ends_at > (select now()));

create function private.archive_ended_events()
returns integer language plpgsql security invoker set search_path = ''
as $archive$
declare archived_count integer;
begin
  update public.local_events
    set status = 'archived', updated_at = now()
    where status in ('published','cancelled') and ends_at <= now();
  get diagnostics archived_count = row_count;
  return archived_count;
end;
$archive$;
revoke all on function private.archive_ended_events() from public,anon,authenticated,service_role;

-- Cron runs as the database owner; no public RPC, secret, or website visit needed.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('bonbons-archive-ended-events', '* * * * *',
  'select private.archive_ended_events();');
select private.archive_ended_events();
