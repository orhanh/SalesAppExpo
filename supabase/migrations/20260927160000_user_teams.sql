-- User-created teams. There are no predefined teams any more: at sign-up you either start a
-- team or join one with its join code, and you can switch later. A team disappears when its
-- last member leaves. Codes are only readable by the team's own members (via my_team()),
-- except that anyone holding a code can preview which team it belongs to.

-- The predefined teams go away entirely; their members get no team and the app asks them to
-- pick one. Recreating the table is simpler than altering the smallint identity.
alter table public.profiles drop constraint profiles_team_id_fkey;
update public.profiles set team_id = null;
drop table public.teams;

create table public.teams (
  id integer generated always as identity primary key,
  name text not null check (length(trim(name)) between 1 and 40),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index teams_name_lower_idx on public.teams (lower(trim(name)));
create index teams_created_by_idx on public.teams (created_by);

alter table public.profiles alter column team_id type integer;
alter table public.profiles
  add constraint profiles_team_id_fkey foreign key (team_id) references public.teams (id) on delete set null;

alter table public.teams enable row level security;
-- Names are public inside the company (leaderboards); codes are not.
grant select (id, name, created_by, created_at) on public.teams to authenticated;
create policy "Members see teams" on public.teams
  for select to authenticated using ((select private.is_member()));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Six characters without look-alikes (no 0/O, 1/I). 32 symbols, so byte % 32 is uniform.
create function private.new_team_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text;
begin
  loop
    v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    select string_agg(substr(v_alphabet, 1 + get_byte(v_bytes, i) % 32, 1), '' order by i)
      into v_code
    from generate_series(0, 5) i;
    exit when not exists (select 1 from public.teams where code = v_code);
  end loop;
  return v_code;
end;
$$;
revoke execute on function private.new_team_code() from public, anon, authenticated;

create function private.clean_team_name(p_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
begin
  if length(v_name) = 0 then
    raise exception 'Give the team a name';
  end if;
  if length(v_name) > 40 then
    raise exception 'Team names can be at most 40 characters';
  end if;
  return v_name;
end;
$$;
revoke execute on function private.clean_team_name(text) from public, anon, authenticated;

-- Creates a team. With p_dedupe a taken name gets " 2", " 3"… (used by sign-up, which must not
-- fail); without it a taken name is an error the user can fix.
create function private.insert_team(p_name text, p_creator uuid, p_dedupe boolean)
returns public.teams
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text := private.clean_team_name(p_name);
  v_try text := v_base;
  v_n integer := 1;
  v_team public.teams;
begin
  loop
    begin
      insert into public.teams (name, code, created_by)
      values (v_try, private.new_team_code(), p_creator)
      returning * into v_team;
      return v_team;
    exception when unique_violation then
      if not p_dedupe then
        raise exception 'A team called % already exists. Ask them for their join code.', v_try;
      end if;
      v_n := v_n + 1;
      v_try := left(v_base, 36) || ' ' || v_n;
    end;
  end loop;
end;
$$;
revoke execute on function private.insert_team(text, uuid, boolean) from public, anon, authenticated;

create function private.drop_team_if_empty(p_team_id integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if p_team_id is null then
    return;
  end if;
  delete from public.teams t
  where t.id = p_team_id and not exists (select 1 from public.profiles p where p.team_id = t.id)
  returning name into v_name;
  if v_name is not null then
    perform private.audit('Team closed (no members left) · ' || v_name);
  end if;
end;
$$;
revoke execute on function private.drop_team_if_empty(integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Sign-up: join by code or start a team, from user metadata
-- ---------------------------------------------------------------------------

-- New auth user -> profile. The very first user becomes the admin so the company can
-- bootstrap itself; everyone after that starts as a seller. Only name and team choice are read
-- from user metadata (never the role). An unknown code or no choice leaves the team empty and
-- the app asks for one.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := upper(trim(coalesce(new.raw_user_meta_data ->> 'team_code', '')));
  v_new text := trim(coalesce(new.raw_user_meta_data ->> 'new_team', ''));
  v_team integer;
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    case when exists (select 1 from public.profiles) then 'seller' else 'admin' end
  );

  if v_code <> '' then
    select id into v_team from public.teams where code = v_code;
  elsif v_new <> '' then
    v_team := (private.insert_team(left(v_new, 40), new.id, true)).id;
  end if;

  if v_team is not null then
    update public.profiles set team_id = v_team where id = new.id;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Callable before sign-up: what team does this code belong to?
create function public.team_preview(p_code text)
returns table (name text, members integer)
language sql
stable
security definer
set search_path = ''
as $$
  select t.name, (select count(*) from public.profiles p where p.team_id = t.id and p.active)::integer
  from public.teams t
  where t.code = upper(trim(p_code));
$$;

create function public.team_name_taken(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.teams where lower(trim(name)) = lower(trim(p_name)));
$$;

create function public.my_team()
returns table (id integer, name text, code text, created_by uuid, members integer)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.name, t.code, t.created_by,
         (select count(*) from public.profiles p where p.team_id = t.id and p.active)::integer
  from public.teams t
  join public.profiles me on me.team_id = t.id
  where me.id = (select auth.uid()) and me.active;
$$;

create function public.join_team(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_old integer;
  v_team public.teams;
begin
  if v_uid is null or not private.is_member() then
    raise exception 'Not signed in';
  end if;
  select * into v_team from public.teams where code = upper(trim(p_code));
  if v_team.id is null then
    raise exception 'No team has that code. Check it with your teammate.';
  end if;
  select team_id into v_old from public.profiles where id = v_uid;
  if v_old = v_team.id then
    raise exception 'You''re already on %', v_team.name;
  end if;
  update public.profiles set team_id = v_team.id where id = v_uid;
  perform private.audit('Joined team · ' || v_team.name);
  perform private.drop_team_if_empty(v_old);
end;
$$;

create function public.create_team(p_name text)
returns table (id integer, code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_old integer;
  v_team public.teams;
begin
  if v_uid is null or not private.is_member() then
    raise exception 'Not signed in';
  end if;
  select team_id into v_old from public.profiles where profiles.id = v_uid;
  v_team := private.insert_team(p_name, v_uid, false);
  update public.profiles set team_id = v_team.id where profiles.id = v_uid;
  perform private.audit('Started team · ' || v_team.name);
  perform private.drop_team_if_empty(v_old);
  return query select v_team.id, v_team.code;
end;
$$;

create function public.regenerate_team_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team public.teams;
  v_code text;
begin
  select t.* into v_team
  from public.teams t join public.profiles me on me.team_id = t.id
  where me.id = (select auth.uid()) and me.active;
  if v_team.id is null then
    raise exception 'You''re not on a team';
  end if;
  if v_team.created_by is distinct from (select auth.uid()) and not private.is_admin() then
    raise exception 'Only the person who started the team can change its code';
  end if;
  v_code := private.new_team_code();
  update public.teams set code = v_code where id = v_team.id;
  perform private.audit('New join code for team · ' || v_team.name);
  return v_code;
end;
$$;

revoke execute on function public.team_preview(text) from public;
revoke execute on function public.team_name_taken(text) from public;
revoke execute on function public.my_team() from public, anon;
revoke execute on function public.join_team(text) from public, anon;
revoke execute on function public.create_team(text) from public, anon;
revoke execute on function public.regenerate_team_code() from public, anon;
grant execute on function public.team_preview(text) to anon, authenticated;
grant execute on function public.team_name_taken(text) to anon, authenticated;
grant execute on function public.my_team() to authenticated;
grant execute on function public.join_team(text) to authenticated;
grant execute on function public.create_team(text) to authenticated;
grant execute on function public.regenerate_team_code() to authenticated;
