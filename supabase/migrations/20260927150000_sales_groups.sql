-- Sales groups: sellers form their own circles inside the company and compete in them.
-- Sales stay company-wide; a group only narrows the leaderboard and feed to its members.
-- Anyone can create a group and owns it; owners (and admins) invite, remove, rename, delete.
-- Clients only read these tables; every change goes through the RPCs below.

create table public.groups (
  id bigint generated always as identity primary key,
  name text not null check (length(trim(name)) between 1 and 40),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index groups_owner_id_idx on public.groups (owner_id);

create table public.group_members (
  group_id bigint not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_id_idx on public.group_members (user_id);

create table public.group_invites (
  id bigint generated always as identity primary key,
  group_id bigint not null references public.groups (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, invitee_id)
);
create index group_invites_invitee_id_idx on public.group_invites (invitee_id);
create index group_invites_invited_by_idx on public.group_invites (invited_by);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function private.in_group(p_group_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = (select auth.uid())
  );
$$;

create function private.manages_group(p_group_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin() or exists (
    select 1 from public.groups
    where id = p_group_id and owner_id = (select auth.uid())
  );
$$;

revoke execute on function private.in_group(bigint) from public, anon;
revoke execute on function private.manages_group(bigint) from public, anon;
grant execute on function private.in_group(bigint) to authenticated;
grant execute on function private.manages_group(bigint) to authenticated;

create function private.clean_group_name(p_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
begin
  if length(v_name) = 0 then
    raise exception 'Give the group a name';
  end if;
  if length(v_name) > 40 then
    raise exception 'Group names can be at most 40 characters';
  end if;
  return v_name;
end;
$$;
revoke execute on function private.clean_group_name(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security (read only)
-- ---------------------------------------------------------------------------

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;

grant select on public.groups, public.group_members, public.group_invites to authenticated;

create policy "Members, invitees and admins see groups" on public.groups
  for select to authenticated
  using (
    (select private.is_member()) and (
      private.in_group(groups.id)
      or exists (select 1 from public.group_invites i where i.group_id = groups.id and i.invitee_id = (select auth.uid()))
      or (select private.is_admin())
    )
  );

create policy "Group members and admins see the member list" on public.group_members
  for select to authenticated
  using ((select private.is_member()) and (private.in_group(group_id) or (select private.is_admin())));

create policy "Invitees and group managers see invites" on public.group_invites
  for select to authenticated
  using (
    (select private.is_member())
    and (invitee_id = (select auth.uid()) or private.manages_group(group_id))
  );

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create function public.create_group(p_name text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id bigint;
  v_name text := private.clean_group_name(p_name);
begin
  if v_uid is null or not private.is_member() then
    raise exception 'Not signed in';
  end if;
  insert into public.groups (name, owner_id) values (v_name, v_uid) returning id into v_id;
  insert into public.group_members (group_id, user_id) values (v_id, v_uid);
  perform private.audit('Created group · ' || v_name);
  return v_id;
end;
$$;

create function public.can_manage_group(p_group_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_member() and private.manages_group(p_group_id);
$$;

create function public.rename_group(p_group_id bigint, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := private.clean_group_name(p_name);
begin
  if not private.is_member() or not private.manages_group(p_group_id) then
    raise exception 'Only the group owner can rename it';
  end if;
  update public.groups set name = v_name where id = p_group_id;
end;
$$;

create function public.delete_group(p_group_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if not private.is_member() or not private.manages_group(p_group_id) then
    raise exception 'Only the group owner can delete it';
  end if;
  delete from public.groups where id = p_group_id returning name into v_name;
  if v_name is not null then
    perform private.audit('Deleted group · ' || v_name);
  end if;
end;
$$;

create function public.invite_to_group(p_group_id bigint, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_member() or not private.manages_group(p_group_id) then
    raise exception 'Only the group owner can invite people';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id and active) then
    raise exception 'That person isn''t an active SalesBell user';
  end if;
  if exists (select 1 from public.group_members where group_id = p_group_id and user_id = p_user_id) then
    raise exception 'They''re already in this group';
  end if;
  insert into public.group_invites (group_id, invitee_id, invited_by)
  values (p_group_id, p_user_id, (select auth.uid()))
  on conflict (group_id, invitee_id) do nothing;
end;
$$;

create function public.respond_to_invite(p_invite_id bigint, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.group_invites;
begin
  if not private.is_member() then
    raise exception 'Not signed in';
  end if;
  delete from public.group_invites
  where id = p_invite_id and invitee_id = (select auth.uid())
  returning * into v_invite;
  if v_invite.id is null then
    raise exception 'That invite is no longer available';
  end if;
  if p_accept then
    insert into public.group_members (group_id, user_id)
    values (v_invite.group_id, v_invite.invitee_id)
    on conflict do nothing;
  end if;
end;
$$;

create function public.remove_member(p_group_id bigint, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group public.groups;
  v_name text;
begin
  select * into v_group from public.groups where id = p_group_id;
  if v_group.id is null or not private.is_member() or not private.manages_group(p_group_id) then
    raise exception 'Only the group owner can remove people';
  end if;
  if p_user_id = v_group.owner_id then
    raise exception 'The owner can''t be removed';
  end if;
  delete from public.group_members where group_id = p_group_id and user_id = p_user_id;
  select full_name into v_name from public.profiles where id = p_user_id;
  perform private.audit('Removed ' || coalesce(v_name, 'a member') || ' from group · ' || v_group.name);
end;
$$;

-- The owner leaving hands the group to the longest-standing member; the last one out deletes it.
create function public.leave_group(p_group_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_next uuid;
begin
  if not private.is_member() then
    raise exception 'Not signed in';
  end if;
  delete from public.group_members where group_id = p_group_id and user_id = v_uid;
  if not found then
    raise exception 'You''re not in this group';
  end if;

  select user_id into v_next from public.group_members
  where group_id = p_group_id order by joined_at, user_id limit 1;

  if v_next is null then
    delete from public.groups where id = p_group_id;
  else
    update public.groups set owner_id = v_next where id = p_group_id and owner_id = v_uid;
  end if;
end;
$$;

-- Profiles are admin-managed; this lets anyone fix their own display name (e.g. after an email invite).
create function public.set_my_name(p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in';
  end if;
  if length(v_name) = 0 or length(v_name) > 60 then
    raise exception 'Enter your name';
  end if;
  update public.profiles set full_name = v_name where id = (select auth.uid());
end;
$$;

revoke execute on function public.create_group(text) from public, anon;
revoke execute on function public.can_manage_group(bigint) from public, anon;
revoke execute on function public.rename_group(bigint, text) from public, anon;
revoke execute on function public.delete_group(bigint) from public, anon;
revoke execute on function public.invite_to_group(bigint, uuid) from public, anon;
revoke execute on function public.respond_to_invite(bigint, boolean) from public, anon;
revoke execute on function public.remove_member(bigint, uuid) from public, anon;
revoke execute on function public.leave_group(bigint) from public, anon;
revoke execute on function public.set_my_name(text) from public, anon;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.can_manage_group(bigint) to authenticated;
grant execute on function public.rename_group(bigint, text) to authenticated;
grant execute on function public.delete_group(bigint) to authenticated;
grant execute on function public.invite_to_group(bigint, uuid) to authenticated;
grant execute on function public.respond_to_invite(bigint, boolean) to authenticated;
grant execute on function public.remove_member(bigint, uuid) to authenticated;
grant execute on function public.leave_group(bigint) to authenticated;
grant execute on function public.set_my_name(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Group-scoped leaderboard
-- ---------------------------------------------------------------------------

drop function public.leaderboard(text);

-- Sales, revenue and points per active member for today ('d'), this week ('w') or month ('m'),
-- optionally narrowed to one group. Security invoker: RLS on group_members hides groups the
-- caller isn't in, so a foreign group id returns no rows.
create function public.leaderboard(p_period text default 'd', p_group_id bigint default null)
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
    and (p_group_id is null or exists (
      select 1 from public.group_members m where m.group_id = p_group_id and m.user_id = p.id
    ))
  group by p.id, p.full_name, t.name;
$$;
revoke execute on function public.leaderboard(text, bigint) from public, anon;
grant execute on function public.leaderboard(text, bigint) to authenticated;

alter publication supabase_realtime add table public.group_invites, public.group_members;
