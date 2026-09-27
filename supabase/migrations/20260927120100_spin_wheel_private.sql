-- Move the privileged part of spin_wheel() out of the exposed schema. The public RPC is now a
-- SECURITY INVOKER wrapper; private.spin_wheel() does the checks and writes.

alter function public.spin_wheel() set schema private;

create function public.spin_wheel()
returns table (field_id smallint, slot smallint, label text, won boolean)
language sql
volatile
security invoker
set search_path = ''
as $$
  select * from private.spin_wheel();
$$;

revoke execute on function private.spin_wheel() from public, anon;
grant execute on function private.spin_wheel() to authenticated;
revoke execute on function public.spin_wheel() from public, anon;
grant execute on function public.spin_wheel() to authenticated;
