-- Teams are walled off from each other. A seller sees their own team's people, sales and feed,
-- and nothing from other teams; admins still see everything. Leaderboards, contest standings and
-- product totals are security invoker, so they narrow to the team through these policies.
-- Sales groups stay inside one team.

-- The caller's team, and any user's team. Security definer so policies on profiles can use
-- them without recursing.
create function private.my_team_id()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select team_id from public.profiles where id = (select auth.uid());
$$;

create function private.team_of(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select team_id from public.profiles where id = p_user_id;
$$;

revoke execute on function private.my_team_id() from public, anon;
revoke execute on function private.team_of(uuid) from public, anon;
grant execute on function private.my_team_id() to authenticated;
grant execute on function private.team_of(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

drop policy "Members see everyone; users always see themselves" on public.profiles;
create policy "Users see themselves, their team, and admins see all" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_admin())
    or ((select private.is_member()) and team_id = (select private.my_team_id()))
  );

-- ---------------------------------------------------------------------------
-- Sales and feed
-- ---------------------------------------------------------------------------

drop policy "Members see all sales" on public.sales;
create policy "Members see their team's sales, admins see all" on public.sales
  for select to authenticated
  using (
    (select private.is_member()) and (
      user_id = (select auth.uid())
      or (select private.is_admin())
      or private.team_of(user_id) = (select private.my_team_id())
    )
  );

-- Contest announcements ('lead') are for everyone; everything else stays within the team.
drop policy "Members read the feed" on public.feed_events;
create policy "Members read their team's feed, admins read all" on public.feed_events
  for select to authenticated
  using (
    (select private.is_member()) and (
      kind = 'lead'
      or user_id = (select auth.uid())
      or (select private.is_admin())
      or private.team_of(user_id) = (select private.my_team_id())
    )
  );

-- ---------------------------------------------------------------------------
-- Sales groups stay inside one team
-- ---------------------------------------------------------------------------

-- People invited by email have no team yet; they may be invited, and the team check happens
-- when they accept.
create or replace function public.invite_to_group(p_group_id bigint, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_team integer;
  v_their_team integer;
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
  select private.team_of(owner_id) into v_owner_team from public.groups where id = p_group_id;
  v_their_team := private.team_of(p_user_id);
  if v_their_team is not null and v_their_team is distinct from v_owner_team then
    raise exception 'Groups are for people on the same team';
  end if;
  insert into public.group_invites (group_id, invitee_id, invited_by)
  values (p_group_id, p_user_id, (select auth.uid()))
  on conflict (group_id, invitee_id) do nothing;
end;
$$;

create or replace function public.respond_to_invite(p_invite_id bigint, p_accept boolean)
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
    if private.my_team_id() is distinct from
       (select private.team_of(owner_id) from public.groups where id = v_invite.group_id) then
      raise exception 'This group belongs to another team';
    end if;
    insert into public.group_members (group_id, user_id)
    values (v_invite.group_id, v_invite.invitee_id)
    on conflict do nothing;
  end if;
end;
$$;

-- Switching team leaves your old team's groups; their numbers would be hidden from you anyway.
-- Ownership passes on as in leave_group, and a group left empty is deleted.
create function private.leave_all_groups(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group bigint;
  v_next uuid;
begin
  delete from public.group_invites where invitee_id = p_user_id;
  for v_group in delete from public.group_members where user_id = p_user_id returning group_id loop
    select user_id into v_next from public.group_members
    where group_id = v_group order by joined_at, user_id limit 1;
    if v_next is null then
      delete from public.groups where id = v_group;
    else
      update public.groups set owner_id = v_next where id = v_group and owner_id = p_user_id;
    end if;
  end loop;
end;
$$;
revoke execute on function private.leave_all_groups(uuid) from public, anon, authenticated;

create or replace function public.join_team(p_code text)
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
  if v_old is not null then
    perform private.leave_all_groups(v_uid);
  end if;
  perform private.audit('Joined team · ' || v_team.name);
  perform private.drop_team_if_empty(v_old);
end;
$$;

create or replace function public.create_team(p_name text)
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
  if v_old is not null then
    perform private.leave_all_groups(v_uid);
  end if;
  perform private.audit('Started team · ' || v_team.name);
  perform private.drop_team_if_empty(v_old);
  return query select v_team.id, v_team.code;
end;
$$;
