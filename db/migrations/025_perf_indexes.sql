-- Perf: index the shopping list's hot read (household filter + position/created_at sort)
-- and drop indexes the Supabase advisor reports as unused or redundant.
create index if not exists idx_shopping_list_items_household_position
  on public.shopping_list_items (household_id, position, created_at);
drop index if exists public.idx_shopping_list_items_created_at;
-- household_members_user_id_key (unique, migration 023) already covers user_id lookups.
drop index if exists public.idx_household_members_user_id;
