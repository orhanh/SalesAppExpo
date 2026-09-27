-- Admins can turn Spin to Win off entirely. While it's off the app hides the wheel, and the
-- database refuses new spins so an older app build can't spin either.

alter table public.settings add column spin_enabled boolean not null default true;
grant update (spin_enabled) on public.settings to authenticated;

create or replace function private.audit_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.spin_every <> old.spin_every then
    perform private.audit('Changed spin rule to 1 spin per ' || new.spin_every || ' sales');
  end if;
  if new.daily_goal <> old.daily_goal then
    perform private.audit('Changed daily goal to ' || new.daily_goal || ' sales');
  end if;
  if new.spin_enabled <> old.spin_enabled then
    perform private.audit(case when new.spin_enabled then 'Turned Spin to Win on' else 'Turned Spin to Win off' end);
  end if;
  return null;
end;
$$;

create function private.guard_spin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select spin_enabled from public.settings) then
    raise exception 'Spin to Win is turned off';
  end if;
  return new;
end;
$$;

create trigger guard_spin
  before insert on public.spins
  for each row execute function private.guard_spin();
