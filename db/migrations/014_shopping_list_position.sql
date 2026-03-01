-- Add position for user-defined order of "to_buy" items (nullable; null = use created_at).

alter table public.shopping_list_items
  add column if not exists position integer;

create index if not exists idx_shopping_list_items_user_position
  on public.shopping_list_items (user_id, position nulls last);
