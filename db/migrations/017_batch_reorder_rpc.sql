-- Batch reorder function for shopping list items.
-- Accepts a JSON array of {id, position} objects and updates all in one query.

create or replace function public.batch_reorder_shopping_list(
  p_household_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  update public.shopping_list_items sli
  set position = (item->>'position')::int
  from jsonb_array_elements(p_items) as item
  where sli.id = (item->>'id')::uuid
    and sli.household_id = p_household_id
    and sli.status = 'to_buy';
end;
$$;
