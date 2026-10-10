-- The send audience includes every confirmed address. Return the same complete
-- list to the admin UI so its confirmation count never truncates at 5,000.
-- The browser still paginates the subscriber table, and tokens remain excluded.
do $audience$
declare definition text;
begin
  select pg_get_functiondef('private.bonbons_event_updates(text,jsonb)'::regprocedure) into definition;
  if position('from public.subscribers order by created_at desc,id desc limit 5000' in definition)=0 then
    raise exception 'Apply the local event and email update migration first.';
  end if;
  definition:=replace(definition,'from public.subscribers order by created_at desc,id desc limit 5000',
    'from public.subscribers order by created_at desc,id desc');
  execute definition;
end
$audience$;
revoke all on function private.bonbons_event_updates(text,jsonb) from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
