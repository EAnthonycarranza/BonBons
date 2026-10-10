-- Run as the database owner. No fixtures commit, no real event is edited or removed.
begin;
create temporary table archive_real_events_before as select * from public.local_events;
insert into public.local_events(title,venue,address,event_date,end_date,end_time,status)
values
 ('QA archive rollback expired','Test venue','San Antonio TX','2020-10-10','2020-10-10','14:00','published'),
 ('QA archive rollback cancelled','Test venue','San Antonio TX','2020-10-10','2020-10-10','14:00','cancelled'),
 ('QA archive rollback draft','Test venue','San Antonio TX','2020-10-10','2020-10-10',null,'draft'),
 ('QA archive rollback future','Test venue','San Antonio TX','2099-10-10','2099-10-11',null,'published'),
 ('QA archive rollback winter','Test venue','San Antonio TX','2026-11-14','2026-11-14','14:00','draft'),
 ('QA archive rollback summer','Test venue','San Antonio TX','2026-07-14','2026-07-14','14:00','draft'),
 ('QA archive rollback spring','Test venue','San Antonio TX','2026-03-08','2026-03-08',null,'draft'),
 ('QA archive rollback fall','Test venue','San Antonio TX','2026-11-01','2026-11-01','01:30','draft');
set local role anon;
do $visibility$
begin
  if exists(select 1 from public.local_events where title like 'QA archive rollback %' and title<>'QA archive rollback future') then
    raise exception 'Expired or unpublished fixture visible before archive job';
  end if;
  if not exists(select 1 from public.local_events where title='QA archive rollback future') then
    raise exception 'Future event hidden';
  end if;
end;
$visibility$;
reset role;
do $archive_tests$
declare archived_count integer;
begin
  if has_function_privilege('anon','private.archive_ended_events()','EXECUTE')
     or has_function_privilege('authenticated','private.archive_ended_events()','EXECUTE')
     or has_function_privilege('service_role','private.archive_ended_events()','EXECUTE') then
    raise exception 'Owner-only archive function exposed';
  end if;
  if (select ends_at from public.local_events where title='QA archive rollback winter') <> timestamptz '2026-11-14 20:00:00+00'
     or (select ends_at from public.local_events where title='QA archive rollback summer') <> timestamptz '2026-07-14 19:00:00+00'
     or (select ends_at from public.local_events where title='QA archive rollback spring') <> timestamptz '2026-03-09 05:00:00+00'
     or (select ends_at from public.local_events where title='QA archive rollback fall') <> timestamptz '2026-11-01 07:30:00+00'
     or (select ends_at from public.local_events where title='QA archive rollback future') <> timestamptz '2099-10-12 05:00:00+00' then
    raise exception 'Wrong San Antonio end instant';
  end if;
  archived_count := private.archive_ended_events();
  if archived_count<>2 then raise exception 'Expected two ended fixtures, got %',archived_count; end if;
  if exists(select 1 from public.local_events where title in ('QA archive rollback expired','QA archive rollback cancelled') and status<>'archived') then
    raise exception 'Ended events did not archive';
  end if;
  if (select status from public.local_events where title='QA archive rollback draft')<>'draft'
     or (select status from public.local_events where title='QA archive rollback future')<>'published' then
    raise exception 'Draft or future event changed';
  end if;
  if private.archive_ended_events()<>0 then raise exception 'Archive job not idempotent'; end if;
  if exists(select * from archive_real_events_before except select * from public.local_events)
     or exists(select e.* from public.local_events e join archive_real_events_before b on b.id=e.id except select * from archive_real_events_before) then
    raise exception 'Real event changed';
  end if;
end;
$archive_tests$;
select 'Archive database checks passed; real events preserved; all fixtures rolled back.' as result;
rollback;
