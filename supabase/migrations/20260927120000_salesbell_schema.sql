-- SalesBell schema: teams, profiles, products, sales, contests, spin wheel, feed and audit log.
-- Access model: every active member can read the team's sales data (leaderboards are public
-- inside the company); only admins manage products, users, contests and the wheel.
-- Feed events and audit entries are written by triggers, never directly by clients.

create schema if not exists private;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.teams (
  id smallint generated always as identity primary key,
  name text not null unique
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) > 0),
  email text not null,
  team_id smallint references public.teams (id),
  role text not null default 'seller' check (role in ('seller', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index profiles_team_id_idx on public.profiles (team_id);

create table public.settings (
  id boolean primary key default true check (id),
  daily_goal integer not null default 10 check (daily_goal > 0),
  spin_every integer not null default 5 check (spin_every between 1 and 20)
);

create table public.products (
  id bigint generated always as identity primary key,
  name text not null check (length(trim(name)) > 0),
  price integer not null check (price > 0),
  points integer not null default 1 check (points >= 0),
  category text not null default 'General',
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.sales (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id),
  product_id bigint not null references public.products (id),
  qty smallint not null check (qty between 1 and 99),
  -- Price and points are copied from the product when the sale is rung, so later edits
  -- to a product never rewrite history.
  unit_price integer not null,
  unit_points integer not null,
  status text not null default 'ok' check (status in ('ok', 'pending', 'cancelled')),
  cancel_reason text,
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index sales_user_id_created_at_idx on public.sales (user_id, created_at desc);
create index sales_created_at_idx on public.sales (created_at desc);
create index sales_product_id_idx on public.sales (product_id);
create index sales_resolved_by_idx on public.sales (resolved_by);
create index sales_pending_idx on public.sales (created_at) where status = 'pending';

create table public.contests (
  id bigint generated always as identity primary key,
  name text not null check (length(trim(name)) > 0),
  type text not null check (
    type in ('most_sales', 'highest_revenue', 'product_challenge', 'first_to_x', 'lottery')
  ),
  description text not null,
  starts_on date not null,
  ends_on date not null,
  prize text not null default 'To be announced',
  target integer check (target > 0),
  product_id bigint references public.products (id),
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index contests_product_id_idx on public.contests (product_id);
create index contests_created_by_idx on public.contests (created_by);

create table public.spin_fields (
  id smallint generated always as identity primary key,
  position smallint not null unique,
  label text not null,
  probability integer not null check (probability between 0 and 100),
  is_win boolean not null default true
);

create table public.spins (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id),
  field_id smallint not null references public.spin_fields (id),
  label text not null,
  won boolean not null,
  created_at timestamptz not null default now()
);
create index spins_user_id_created_at_idx on public.spins (user_id, created_at desc);
create index spins_field_id_idx on public.spins (field_id);

create table public.feed_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id),
  kind text not null check (kind in ('bell', 'goal', 'lead', 'spin')),
  text text not null,
  sub text not null default '',
  created_at timestamptz not null default now()
);
create index feed_events_created_at_idx on public.feed_events (created_at desc);
create index feed_events_user_id_idx on public.feed_events (user_id);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id),
  actor_name text not null,
  action text not null,
  created_at timestamptz not null default now()
);
create index audit_log_created_at_idx on public.audit_log (created_at desc);
create index audit_log_actor_id_idx on public.audit_log (actor_id);

-- ---------------------------------------------------------------------------
-- Helpers (private schema, not exposed through the Data API)
-- ---------------------------------------------------------------------------

create function private.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and active
  );
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and active and role = 'admin'
  );
$$;

revoke execute on function private.is_member() from public, anon;
revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_member() to authenticated;
grant execute on function private.is_admin() to authenticated;

-- Start of the current day / week / month in the company's time zone.
create function private.period_start(p_period text)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (
    case p_period
      when 'w' then date_trunc('week', now() at time zone 'Europe/Copenhagen')
      when 'm' then date_trunc('month', now() at time zone 'Europe/Copenhagen')
      else date_trunc('day', now() at time zone 'Europe/Copenhagen')
    end
  ) at time zone 'Europe/Copenhagen';
$$;
revoke execute on function private.period_start(text) from public, anon;
grant execute on function private.period_start(text) to authenticated;

create function private.actor_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select full_name || case when role = 'admin' then ' (admin)' else '' end
       from public.profiles where id = (select auth.uid())),
    'System'
  );
$$;
revoke execute on function private.actor_name() from public, anon, authenticated;

create function private.audit(p_action text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, actor_name, action)
  values ((select auth.uid()), private.actor_name(), p_action);
$$;
revoke execute on function private.audit(text) from public, anon, authenticated;

create function private.kr(p_amount bigint)
returns text
language sql
immutable
set search_path = ''
as $$
  select to_char(p_amount, 'FM999,999,999,990') || ' kr';
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- New auth user -> profile. The very first user becomes the admin so the company can
-- bootstrap itself; everyone after that starts as a seller. Only name and team are read
-- from user metadata (never the role).
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team smallint;
begin
  select id into v_team from public.teams
  where id = nullif(new.raw_user_meta_data ->> 'team_id', '')::smallint;

  insert into public.profiles (id, full_name, email, team_id, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    v_team,
    case when exists (select 1 from public.profiles) then 'seller' else 'admin' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Admins manage users, but nobody can change their own role or deactivate themselves.
create function private.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id = (select auth.uid()) and (new.role <> old.role or new.active <> old.active) then
    raise exception 'You can''t change your own role or status';
  end if;
  if new.active <> old.active then
    perform private.audit(
      case when new.active then 'Reactivated user ' else 'Deactivated user ' end || new.full_name
    );
  end if;
  if new.role <> old.role then
    perform private.audit('Changed ' || new.full_name || ' to ' || new.role);
  end if;
  return new;
end;
$$;

create trigger guard_profile_update
  before update on public.profiles
  for each row execute function private.guard_profile_update();

-- Ringing a sale: the server decides who sold it and what it was worth.
create function private.prepare_sale()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products;
begin
  select * into v_product from public.products where id = new.product_id;
  if v_product.id is null or not v_product.visible then
    raise exception 'That product is not available';
  end if;
  new.user_id := (select auth.uid());
  new.unit_price := v_product.price;
  new.unit_points := v_product.points;
  new.status := 'ok';
  new.cancel_reason := null;
  new.resolved_by := null;
  new.resolved_at := null;
  new.created_at := now();
  return new;
end;
$$;

create trigger prepare_sale
  before insert on public.sales
  for each row execute function private.prepare_sale();

create function private.after_sale()
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

  insert into public.feed_events (user_id, kind, text, sub)
  values (new.user_id, 'bell', 'rang the bell!', v_name || ' × ' || new.qty);

  if v_before < v_goal and v_before + new.qty >= v_goal then
    insert into public.feed_events (user_id, kind, text, sub)
    values (new.user_id, 'goal', 'hit today''s goal!', (v_before + new.qty) || ' of ' || v_goal || ' sales');
  end if;
  return null;
end;
$$;

create trigger after_sale
  after insert on public.sales
  for each row execute function private.after_sale();

-- Sales are never edited directly: a seller can only request cancellation of their own
-- sale, and only an admin can resolve that request.
create function private.guard_sale_update()
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

  if old.status = 'ok' and new.status = 'pending' then
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

create trigger guard_sale_update
  before update on public.sales
  for each row execute function private.guard_sale_update();

create function private.audit_product()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.audit(
    case when tg_op = 'INSERT' then 'Created product ' else 'Updated product ' end
    || new.name || ' · ' || private.kr(new.price) || ' · ' || new.points || ' pts'
    || case when new.visible then '' else ' · hidden' end
  );
  return null;
end;
$$;

create trigger audit_product
  after insert or update on public.products
  for each row execute function private.audit_product();

create function private.after_contest()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.audit('Created contest "' || new.name || '"');
  if new.created_by is not null then
    insert into public.feed_events (user_id, kind, text, sub)
    values (new.created_by, 'lead', 'started a new contest: ' || new.name,
            'Starts ' || to_char(new.starts_on, 'Dy FMDD Mon'));
  end if;
  return null;
end;
$$;

create trigger after_contest
  after insert on public.contests
  for each row execute function private.after_contest();

create function private.audit_settings()
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
  return null;
end;
$$;

create trigger audit_settings
  after update on public.settings
  for each row execute function private.audit_settings();

create function private.audit_spin_field()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.probability <> old.probability then
    perform private.audit(
      'Changed wheel odds for ' || new.label || ' ' || old.probability || '% → ' || new.probability || '%'
    );
  end if;
  return null;
end;
$$;

create trigger audit_spin_field
  after update on public.spin_fields
  for each row execute function private.audit_spin_field();

revoke execute on all functions in schema private from public, anon;

-- ---------------------------------------------------------------------------
-- Row level security + Data API grants
-- ---------------------------------------------------------------------------

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.contests enable row level security;
alter table public.spin_fields enable row level security;
alter table public.spins enable row level security;
alter table public.feed_events enable row level security;
alter table public.audit_log enable row level security;

-- Teams are listed on the sign-up screen, before the user has an account.
grant select on public.teams to anon, authenticated;
create policy "Anyone can list teams" on public.teams
  for select to anon, authenticated using (true);

grant select on public.profiles to authenticated;
grant update (full_name, team_id, role, active) on public.profiles to authenticated;
create policy "Members see everyone; users always see themselves" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_member()));
create policy "Admins update users" on public.profiles
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select on public.settings to authenticated;
grant update (daily_goal, spin_every) on public.settings to authenticated;
create policy "Members read settings" on public.settings
  for select to authenticated using ((select private.is_member()));
create policy "Admins update settings" on public.settings
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select, insert on public.products to authenticated;
grant update (name, price, points, category, visible) on public.products to authenticated;
create policy "Members see visible products, admins see all" on public.products
  for select to authenticated
  using ((select private.is_member()) and (visible or (select private.is_admin())));
create policy "Admins create products" on public.products
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update products" on public.products
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select on public.sales to authenticated;
grant insert (product_id, qty) on public.sales to authenticated;
grant update (status, cancel_reason) on public.sales to authenticated;
create policy "Members see all sales" on public.sales
  for select to authenticated using ((select private.is_member()));
create policy "Members ring their own sales" on public.sales
  for insert to authenticated
  with check ((select private.is_member()) and user_id = (select auth.uid()));
create policy "Owners and admins update sales" on public.sales
  for update to authenticated
  using ((select private.is_member()) and (user_id = (select auth.uid()) or (select private.is_admin())))
  with check ((select private.is_member()) and (user_id = (select auth.uid()) or (select private.is_admin())));

grant select, insert, update, delete on public.contests to authenticated;
create policy "Members see contests" on public.contests
  for select to authenticated using ((select private.is_member()));
create policy "Admins create contests" on public.contests
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update contests" on public.contests
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy "Admins delete contests" on public.contests
  for delete to authenticated using ((select private.is_admin()));

grant select on public.spin_fields to authenticated;
grant update (probability) on public.spin_fields to authenticated;
create policy "Members see the wheel" on public.spin_fields
  for select to authenticated using ((select private.is_member()));
create policy "Admins tune the wheel" on public.spin_fields
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Spins are only created through spin_wheel(), which picks the result on the server.
grant select on public.spins to authenticated;
create policy "Users see their own spins, admins see all" on public.spins
  for select to authenticated
  using ((select private.is_member()) and (user_id = (select auth.uid()) or (select private.is_admin())));

grant select on public.feed_events to authenticated;
create policy "Members read the feed" on public.feed_events
  for select to authenticated using ((select private.is_member()));

grant select on public.audit_log to authenticated;
create policy "Admins read the audit log" on public.audit_log
  for select to authenticated using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- RPC functions
-- ---------------------------------------------------------------------------

-- Sales, revenue and points per active member for today ('d'), this week ('w') or month ('m').
create function public.leaderboard(p_period text default 'd')
returns table (
  user_id uuid,
  full_name text,
  team text,
  sales bigint,
  revenue bigint,
  points bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    p.full_name,
    coalesce(t.name, ''),
    coalesce(sum(s.qty), 0)::bigint,
    coalesce(sum(s.qty * s.unit_price), 0)::bigint,
    coalesce(sum(s.qty * s.unit_points), 0)::bigint
  from public.profiles p
  left join public.teams t on t.id = p.team_id
  left join public.sales s
    on s.user_id = p.id
   and s.status <> 'cancelled'
   and s.created_at >= private.period_start(p_period)
  where p.active
  group by p.id, p.full_name, t.name;
$$;

-- Units sold per product in the period.
create function public.product_sales(p_period text default 'd')
returns table (product_id bigint, name text, units bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select pr.id, pr.name, coalesce(sum(s.qty), 0)::bigint
  from public.products pr
  left join public.sales s
    on s.product_id = pr.id
   and s.status <> 'cancelled'
   and s.created_at >= private.period_start(p_period)
  group by pr.id, pr.name
  order by pr.id;
$$;

-- Standings for every contest that has started. The value depends on the contest type.
create function public.contest_standings()
returns table (contest_id bigint, user_id uuid, full_name text, value bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    p.id,
    p.full_name,
    coalesce(sum(
      case c.type
        when 'highest_revenue' then s.qty * s.unit_price
        when 'product_challenge' then case when s.product_id = c.product_id then s.qty else 0 end
        when 'lottery' then case when s.product_id = c.product_id then s.qty * 3 else s.qty end
        else s.qty
      end
    ), 0)::bigint
  from public.contests c
  cross join public.profiles p
  left join public.sales s
    on s.user_id = p.id
   and s.status <> 'cancelled'
   and s.created_at >= (c.starts_on::timestamp at time zone 'Europe/Copenhagen')
   and s.created_at < ((c.ends_on + 1)::timestamp at time zone 'Europe/Copenhagen')
  where p.active
    and c.starts_on <= (now() at time zone 'Europe/Copenhagen')::date
  group by c.id, p.id, p.full_name;
$$;

-- Personal numbers for the profile screen.
create function public.my_stats()
returns json
language sql
stable
security invoker
set search_path = ''
as $$
  with mine as (
    select s.*, (s.created_at at time zone 'Europe/Copenhagen')::date as sale_day
    from public.sales s
    where s.user_id = (select auth.uid()) and s.status <> 'cancelled'
  ),
  per_day as (
    select sale_day, sum(qty) as n from mine group by sale_day
  ),
  this_month as (
    select * from mine where created_at >= private.period_start('m')
  ),
  top_product as (
    select pr.name, sum(m.qty) as n
    from this_month m join public.products pr on pr.id = m.product_id
    group by pr.name
    order by n desc
    limit 1
  )
  select json_build_object(
    'today_sales', (select coalesce(sum(qty), 0) from mine where created_at >= private.period_start('d')),
    'today_revenue', (select coalesce(sum(qty * unit_price), 0) from mine where created_at >= private.period_start('d')),
    'week_sales', (select coalesce(sum(qty), 0) from mine where created_at >= private.period_start('w')),
    'week_revenue', (select coalesce(sum(qty * unit_price), 0) from mine where created_at >= private.period_start('w')),
    'month_sales', (select coalesce(sum(qty), 0) from this_month),
    'month_revenue', (select coalesce(sum(qty * unit_price), 0) from this_month),
    'month_days', extract(day from (now() at time zone 'Europe/Copenhagen'))::int,
    'best_day', (select sale_day from per_day order by n desc, sale_day desc limit 1),
    'best_day_sales', (select coalesce(max(n), 0) from per_day),
    'top_product', (select name from top_product),
    'top_product_share', (
      select case when sum(qty) > 0 then round(100.0 * (select n from top_product) / sum(qty)) else 0 end
      from this_month
    )
  );
$$;

-- Spins earned today and how many sales until the next one.
create function public.spin_status()
returns table (available integer, sold_today integer, spin_every integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with sold as (
    select coalesce(sum(qty), 0)::int as n
    from public.sales
    where user_id = (select auth.uid())
      and status <> 'cancelled'
      and created_at >= private.period_start('d')
  ),
  used as (
    select count(*)::int as n
    from public.spins
    where user_id = (select auth.uid())
      and created_at >= private.period_start('d')
  )
  select
    greatest(0, sold.n / st.spin_every - used.n),
    sold.n,
    st.spin_every
  from sold, used, public.settings st;
$$;

-- Spins the wheel for the caller. The result is chosen here, weighted by probability,
-- so a client can't pick its own prize.
create function public.spin_wheel()
returns table (field_id smallint, slot smallint, label text, won boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_available integer;
  v_total integer;
  v_roll double precision;
  v_field_id smallint;
  v_field public.spin_fields;
begin
  if v_uid is null or not private.is_member() then
    raise exception 'Not signed in';
  end if;

  -- One spin at a time per user.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  select greatest(0,
           coalesce((select sum(qty) from public.sales
                     where user_id = v_uid and status <> 'cancelled'
                       and created_at >= private.period_start('d')), 0)::int
           / st.spin_every
           - (select count(*) from public.spins
              where user_id = v_uid and created_at >= private.period_start('d'))::int)
    into v_available
  from public.settings st;

  if v_available < 1 then
    raise exception 'No spins available';
  end if;

  select sum(probability) into v_total from public.spin_fields;
  if coalesce(v_total, 0) <= 0 then
    raise exception 'The wheel has no odds configured';
  end if;

  v_roll := random() * v_total;
  select f.id into v_field_id
  from (
    select sf.id, sf.position, sum(sf.probability) over (order by sf.position) as upto
    from public.spin_fields sf
    where sf.probability > 0
  ) f
  where f.upto > v_roll
  order by f.position
  limit 1;
  select * into v_field from public.spin_fields sf where sf.id = v_field_id;

  insert into public.spins (user_id, field_id, label, won)
  values (v_uid, v_field.id, v_field.label, v_field.is_win);

  if v_field.is_win then
    insert into public.feed_events (user_id, kind, text, sub)
    values (v_uid, 'spin', 'won ' || v_field.label || '!', 'Prize wheel');
  end if;

  return query select v_field.id, v_field.position, v_field.label, v_field.is_win;
end;
$$;

revoke execute on function public.leaderboard(text) from public, anon;
revoke execute on function public.product_sales(text) from public, anon;
revoke execute on function public.contest_standings() from public, anon;
revoke execute on function public.my_stats() from public, anon;
revoke execute on function public.spin_status() from public, anon;
revoke execute on function public.spin_wheel() from public, anon;
grant execute on function public.leaderboard(text) to authenticated;
grant execute on function public.product_sales(text) to authenticated;
grant execute on function public.contest_standings() to authenticated;
grant execute on function public.my_stats() to authenticated;
grant execute on function public.spin_status() to authenticated;
grant execute on function public.spin_wheel() to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: the feed and sales drive live leaderboards
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.feed_events, public.sales;

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------

insert into public.teams (name) values ('Team København'), ('Team Odense'), ('Team Aarhus');

insert into public.settings (id) values (true);

insert into public.products (name, price, points, category) values
  ('Product A', 500, 1, 'Subscriptions'),
  ('Product B', 750, 2, 'Subscriptions'),
  ('Product C', 1000, 3, 'Hardware');

insert into public.spin_fields (position, label, probability, is_win) values
  (0, '50 kr', 10, true),
  (1, 'Free coffee', 20, true),
  (2, '100 kr', 5, true),
  (3, 'Bonus points', 20, true),
  (4, 'No win', 25, false),
  (5, 'Extra ticket', 13, true),
  (6, 'Special prize', 2, true),
  (7, '25 kr', 5, true);

insert into public.contests (name, type, description, starts_on, ends_on, prize, target, product_id, created_by)
values
  ('Most sales this week', 'most_sales',
   'The seller with the most registered sales from Monday to Sunday wins.',
   '2026-09-21', '2026-09-27', 'Dinner for two', null, null, null),
  ('Product B challenge', 'product_challenge',
   'Sell the most units of Product B this week.',
   '2026-09-21', '2026-09-27', '500 kr gift card', null,
   (select id from public.products where name = 'Product B'), null),
  ('First to 150', 'first_to_x',
   'The first seller to reach 150 sales in September wins. Every sale since 1 September counts.',
   '2026-09-01', '2026-09-30', 'An extra day off', 150, null, null),
  ('October revenue race', 'highest_revenue',
   'The seller with the highest total revenue in October wins.',
   '2026-10-01', '2026-10-31', 'Team dinner', null, null, null);
