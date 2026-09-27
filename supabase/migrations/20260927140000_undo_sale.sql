-- Undo: a seller can take back their own sale for a few seconds after ringing it, without
-- an admin. Older sales still go through the cancellation request flow.

-- Tie feed events to the sale that caused them, so an undone sale leaves no trace in the feed.
alter table public.feed_events
  add column sale_id bigint references public.sales (id) on delete cascade;
create index feed_events_sale_id_idx on public.feed_events (sale_id);

create or replace function private.after_sale()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_goal integer;
  v_before bigint;
begin
  select name into v_name from public.products where id = new.product_id;
  select daily_goal into v_goal from public.settings;
  select coalesce(sum(qty), 0) into v_before
  from public.sales
  where user_id = new.user_id
    and status <> 'cancelled'
    and created_at >= private.period_start('d')
    and id <> new.id;

  insert into public.feed_events (user_id, kind, text, sub, sale_id)
  values (new.user_id, 'bell', 'rang the bell!', v_name || ' × ' || new.qty, new.id);

  if v_before < v_goal and v_before + new.qty >= v_goal then
    insert into public.feed_events (user_id, kind, text, sub, sale_id)
    values (new.user_id, 'goal', 'hit today''s goal!', (v_before + new.qty) || ' of ' || v_goal || ' sales', new.id);
  end if;
  return null;
end;
$$;

-- Same rules as before, plus one path: ok -> cancelled, only from inside public.undo_sale.
create or replace function private.guard_sale_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_line text;
begin
  if (new.user_id, new.product_id, new.qty, new.unit_price, new.unit_points, new.created_at)
     is distinct from
     (old.user_id, old.product_id, old.qty, old.unit_price, old.unit_points, old.created_at) then
    raise exception 'Sales can''t be edited';
  end if;

  select name || ' × ' || old.qty into v_line from public.products where id = old.product_id;

  if old.status = 'ok' and new.status = 'cancelled'
     and current_setting('salesbell.undo', true) = 'on' then
    null; -- checked and audited by public.undo_sale
  elsif old.status = 'ok' and new.status = 'pending' then
    if old.user_id <> (select auth.uid()) then
      raise exception 'You can only request cancellation of your own sales';
    end if;
    if coalesce(trim(new.cancel_reason), '') = '' then
      raise exception 'Give a reason for the cancellation';
    end if;
    perform private.audit('Requested cancellation · ' || v_line || ' · ' || new.cancel_reason);
  elsif old.status = 'pending' and new.status in ('cancelled', 'ok') then
    if not private.is_admin() then
      raise exception 'Only admins can resolve cancellation requests';
    end if;
    new.resolved_by := (select auth.uid());
    new.resolved_at := now();
    new.cancel_reason := old.cancel_reason;
    perform private.audit(
      case when new.status = 'cancelled' then 'Approved' else 'Rejected' end
      || ' cancellation · ' || v_line
      || ' (' || to_char(old.created_at at time zone 'Europe/Copenhagen', 'Dy DD Mon HH24:MI') || ')'
    );
  elsif new.status is distinct from old.status or new.cancel_reason is distinct from old.cancel_reason then
    raise exception 'Invalid status change';
  end if;
  return new;
end;
$$;

-- The client shows Undo for 5 seconds; the server allows 15 to cover a slow connection.
create function public.undo_sale(p_sale_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_sale public.sales;
  v_line text;
begin
  if v_uid is null or not private.is_member() then
    raise exception 'Not signed in';
  end if;

  select * into v_sale from public.sales where id = p_sale_id for update;
  if v_sale.id is null or v_sale.user_id <> v_uid or v_sale.status <> 'ok' then
    raise exception 'That sale can''t be undone';
  end if;
  if v_sale.created_at < now() - interval '15 seconds' then
    raise exception 'Too late to undo. Request a cancellation from History instead.';
  end if;
  -- A spin taken since the sale may have been earned by it.
  if exists (select 1 from public.spins where user_id = v_uid and created_at >= v_sale.created_at) then
    raise exception 'You''ve spun since this sale. Request a cancellation from History instead.';
  end if;

  perform set_config('salesbell.undo', 'on', true);
  update public.sales
     set status = 'cancelled', cancel_reason = 'Undone by seller',
         resolved_by = v_uid, resolved_at = now()
   where id = p_sale_id;
  perform set_config('salesbell.undo', 'off', true);

  delete from public.feed_events where sale_id = p_sale_id;

  select name || ' × ' || v_sale.qty into v_line from public.products where id = v_sale.product_id;
  perform private.audit('Undid sale · ' || v_line);
end;
$$;
revoke execute on function public.undo_sale(bigint) from public, anon;
grant execute on function public.undo_sale(bigint) to authenticated;
