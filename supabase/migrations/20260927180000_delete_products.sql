-- Admins can delete products. A product nobody has sold and no contest uses is removed for
-- real; otherwise it's archived: gone from every product list and no longer sellable, but kept
-- so sales history, revenue and contests stay intact.

alter table public.products add column deleted_at timestamptz;

-- Product names show up in everyone's sales history, including hidden and archived ones, so
-- members can read all products. The app only offers visible, non-archived ones for sale, and
-- prepare_sale refuses anything that isn't visible.
drop policy "Members see visible products, admins see all" on public.products;
create policy "Members see products" on public.products
  for select to authenticated using ((select private.is_member()));

-- Archiving is logged by delete_product, not as an ordinary edit.
create or replace function private.audit_product()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.deleted_at is distinct from old.deleted_at then
    return null;
  end if;
  perform private.audit(
    case when tg_op = 'INSERT' then 'Created product ' else 'Updated product ' end
    || new.name || ' · ' || private.kr(new.price) || ' · ' || new.points || ' pts'
    || case when new.visible then '' else ' · hidden' end
  );
  return null;
end;
$$;

create function public.delete_product(p_product_id bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products;
begin
  if not private.is_admin() then
    raise exception 'Only admins can delete products';
  end if;
  select * into v_product from public.products where id = p_product_id and deleted_at is null for update;
  if v_product.id is null then
    raise exception 'That product no longer exists';
  end if;

  if exists (select 1 from public.sales where product_id = p_product_id)
     or exists (select 1 from public.contests where product_id = p_product_id) then
    update public.products set deleted_at = now(), visible = false where id = p_product_id;
    perform private.audit('Deleted product ' || v_product.name || ' (kept in sales history)');
    return 'archived';
  end if;

  delete from public.products where id = p_product_id;
  perform private.audit('Deleted product ' || v_product.name);
  return 'deleted';
end;
$$;
revoke execute on function public.delete_product(bigint) from public, anon;
grant execute on function public.delete_product(bigint) to authenticated;
