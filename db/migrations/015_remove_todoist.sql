-- Remove Todoist integration: drop connection_id from pantry, drop todoist_connections table.
-- Pantry now uses user_id exclusively (added in migration 013).

-- Drop RLS policies that reference todoist_connections
drop policy if exists "Users can manage pantry for own connections" on public.pantry;

-- Drop the index and FK on connection_id
drop index if exists idx_pantry_connection_id;
drop index if exists idx_pantry_connection_ingredient;

-- Remove connection_id column from pantry
alter table public.pantry drop column if exists connection_id;

-- Create a simple unique constraint for (user_id, ingredient_id)
drop index if exists idx_pantry_user_ingredient_direct;
create unique index if not exists idx_pantry_user_ingredient
  on public.pantry (user_id, ingredient_id);

-- Make user_id NOT NULL now that connection_id is gone
alter table public.pantry alter column user_id set not null;

-- Recreate RLS policy for pantry using only user_id
create policy "Users can manage own pantry"
  on public.pantry
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Drop the todoist_connections index
drop index if exists idx_todoist_connections_user_id;

-- Drop the todoist_connections table
drop table if exists public.todoist_connections;
