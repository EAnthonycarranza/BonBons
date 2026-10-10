-- Run as the SQL editor owner; all fixtures are rolled back and no mail is sent.
begin;
do $test$
declare
  ev jsonb; camp jsonb; claimed jsonb; item jsonb; info jsonb; token text; i int;
  design jsonb := '{"subject":"QA update","headline":"See you there","message":"Testing only","preheader":"Preview","signoff":"Team","buttonLabel":"Events","accent":"#d83f86","layout":"digest","image":"","eventIds":[]}';
begin
  ev:=private.bonbons_event_updates('event_save','{"title":"QA rollback event","venue":"Test venue","address":"San Antonio TX","event_date":"2099-10-20","end_date":"2099-10-20","start_time":"10:00","end_time":"15:00","status":"draft"}');
  if ev->>'status'<>'draft' then raise exception 'Draft save failed'; end if;
  begin perform public.bonbons_admin('wrong-token','event_list','{}'); raise exception 'Unauthenticated dispatcher accepted'; exception when sqlstate '28000' then null; end;
  ev:=private.bonbons_event_updates('event_save',ev||jsonb_build_object('status','published'));
  design:=design||jsonb_build_object('eventIds',jsonb_build_array(ev->>'id'));
  camp:=private.bonbons_event_updates('event_campaign_save',jsonb_build_object('design',design));
  begin perform private.bonbons_event_updates('event_campaign_begin',jsonb_build_object('id',camp->>'id')); raise exception 'Empty audience accepted'; exception when invalid_parameter_value then null; end;
  for i in 1..5 loop
    token:=repeat(i::text,48);
    info:=private.bonbons_event_updates('subscriber_request',jsonb_build_object('email','qa-events-rollback-'||i||'@example.invalid','token',token,'source','events'));
    if not (info->>'send')::boolean then raise exception 'Confirmation request failed'; end if;
    if exists(select 1 from public.subscribers where email='qa-events-rollback-'||i||'@example.invalid' and status<>'pending') then raise exception 'Premature subscription'; end if;
    if i<5 then perform private.bonbons_event_updates('subscriber_confirm',jsonb_build_object('token',token)); end if;
  end loop;
  info:=private.bonbons_event_updates('subscriber_request',jsonb_build_object('email','qa-events-rollback-1@example.invalid','token',repeat('a',48)));
  if (info->>'send')::boolean then raise exception 'Active address resent confirmation'; end if;
  begin perform private.bonbons_event_updates('subscriber_confirm',jsonb_build_object('token',repeat('f',48))); raise exception 'Invalid confirmation accepted'; exception when invalid_parameter_value then null; end;
  perform private.bonbons_event_updates('event_campaign_begin',jsonb_build_object('id',camp->>'id'));
  perform private.bonbons_event_updates('event_campaign_begin',jsonb_build_object('id',camp->>'id'));
  info:=private.bonbons_event_updates('event_campaign_status',jsonb_build_object('id',camp->>'id'));
  if (info->>'total')::int<>4 then raise exception 'Audience must be confirmed and deduplicated: %',info; end if;
  begin perform private.bonbons_event_updates('event_campaign_save',jsonb_build_object('id',camp->>'id','design',design)); raise exception 'Started campaign edited'; exception when invalid_parameter_value then null; end;
  ev:=private.bonbons_event_updates('event_save',ev||jsonb_build_object('title','Changed after snapshot','status','archived'));
  select unsubscribe_token into token from public.subscribers where email='qa-events-rollback-4@example.invalid';
  perform private.bonbons_event_updates('subscriber_unsubscribe',jsonb_build_object('token',token));
  perform private.bonbons_event_updates('subscriber_unsubscribe',jsonb_build_object('token',token));
  begin perform private.bonbons_event_updates('subscriber_confirm',jsonb_build_object('token',repeat('4',48))); raise exception 'Unsubscribed address reactivated with old link'; exception when invalid_parameter_value then null; end;
  claimed:=private.bonbons_event_updates('event_campaign_claim',jsonb_build_object('id',camp->>'id'));
  if jsonb_array_length(claimed)>3 then raise exception 'Unbounded send batch'; end if;
  for item in select value from jsonb_array_elements(claimed) loop
    if item->>'email'='qa-events-rollback-4@example.invalid' then raise exception 'Unsubscribed audience claimed'; end if;
    if item->'snapshot'->'events'->0->>'title'<>'QA rollback event' then raise exception 'Send snapshot changed'; end if;
    info:=private.bonbons_event_updates('event_delivery_check',jsonb_build_object('id',item->>'id','attempt',item->>'attempt'));
    if not (info->>'active')::boolean then raise exception 'Claim not current'; end if;
    perform private.bonbons_event_updates('event_delivery_finish',jsonb_build_object('id',item->>'id','attempt',item->>'attempt','status',case when item->>'email'='qa-events-rollback-1@example.invalid' then 'failed' else 'sent' end));
    begin perform private.bonbons_event_updates('event_delivery_finish',jsonb_build_object('id',item->>'id','attempt',item->>'attempt','status','sent')); raise exception 'Duplicate completion accepted'; exception when invalid_parameter_value then null; end;
  end loop;
  claimed:=private.bonbons_event_updates('event_campaign_claim',jsonb_build_object('id',camp->>'id'));
  for item in select value from jsonb_array_elements(claimed) loop
    perform private.bonbons_event_updates('subscriber_unsubscribe_admin',jsonb_build_object('id',(select id from public.subscribers where email=item->>'email')));
    info:=private.bonbons_event_updates('event_delivery_check',jsonb_build_object('id',item->>'id','attempt',item->>'attempt'));
    if (info->>'active')::boolean then raise exception 'Unsubscribe did not revoke pending send'; end if;
    perform private.bonbons_event_updates('event_delivery_finish',jsonb_build_object('id',item->>'id','attempt',item->>'attempt','status','skipped'));
  end loop;
  perform private.bonbons_event_updates('event_campaign_retry',jsonb_build_object('id',camp->>'id'));
  info:=private.bonbons_event_updates('event_campaign_status',jsonb_build_object('id',camp->>'id'));
  if (info->>'queued')::int<>1 then raise exception 'Retry repeated sent/skipped rows: %',info; end if;
  -- An inactive address can rejoin only with fresh consent and confirmation.
  update public.subscribers set confirmation_sent_at=null where email='qa-events-rollback-4@example.invalid';
  perform private.bonbons_event_updates('subscriber_request',jsonb_build_object('email','qa-events-rollback-4@example.invalid','token',repeat('b',48)));
  perform private.bonbons_event_updates('subscriber_confirm',jsonb_build_object('token',repeat('b',48)));
  perform private.bonbons_event_updates('event_campaign_begin',jsonb_build_object('id',camp->>'id'));
  info:=private.bonbons_event_updates('event_campaign_status',jsonb_build_object('id',camp->>'id'));
  if (info->>'total')::int<>4 then raise exception 'Resume changed original audience'; end if;
  if has_table_privilege('anon','public.subscribers','SELECT') or has_table_privilege('anon','public.event_email_deliveries','SELECT') or has_function_privilege('anon','private.bonbons_event_updates(text,jsonb)','EXECUTE') then raise exception 'Private audience publicly exposed'; end if;
end
$test$;
set local role anon;
do $visibility$
begin
  if exists(select 1 from public.local_events where status not in ('published','cancelled')) then raise exception 'Draft/archived event visible publicly'; end if;
  if not exists(select 1 from pg_policies where tablename='local_events' and qual is not null) then raise exception 'Missing event read policy'; end if;
end
$visibility$;
reset role;
select 'Event database checks passed; all fixtures rolled back.' as result;
rollback;
