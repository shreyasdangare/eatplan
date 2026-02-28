-- Enable Row Level Security (RLS) on all public tables exposed via PostgREST.
-- Policies scope access by auth.uid() so users only see/modify their own data.
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public

-- ---------------------------------------------------------------------------
-- dishes (user-owned)
-- ---------------------------------------------------------------------------
alter table public.dishes
  enable row level security;

drop policy if exists "Users can manage own dishes" on public.dishes;
create policy "Users can manage own dishes"
  on public.dishes
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- ingredients (shared catalog; no user_id)
-- Read-only for authenticated/anon to avoid permissive RLS (lint 0024). Writes
-- from the app use the service role in API routes, so no RPC needed.
-- ---------------------------------------------------------------------------
alter table public.ingredients
  enable row level security;

drop policy if exists "Authenticated users can read ingredients" on public.ingredients;
drop policy if exists "Authenticated users can insert ingredients" on public.ingredients;
drop policy if exists "Authenticated users can update ingredients" on public.ingredients;
drop policy if exists "Authenticated users can delete ingredients" on public.ingredients;
create policy "Authenticated users can read ingredients"
  on public.ingredients
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- dish_ingredients (scoped by owning dish)
-- ---------------------------------------------------------------------------
alter table public.dish_ingredients
  enable row level security;

drop policy if exists "Users can manage dish_ingredients for own dishes" on public.dish_ingredients;
create policy "Users can manage dish_ingredients for own dishes"
  on public.dish_ingredients
  for all
  using (
    exists (
      select 1 from public.dishes d
      where d.id = dish_ingredients.dish_id and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.dishes d
      where d.id = dish_ingredients.dish_id and d.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- meal_plans (user-owned)
-- ---------------------------------------------------------------------------
alter table public.meal_plans
  enable row level security;

drop policy if exists "Users can manage own meal_plans" on public.meal_plans;
create policy "Users can manage own meal_plans"
  on public.meal_plans
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- favorites (user-owned)
-- ---------------------------------------------------------------------------
alter table public.favorites
  enable row level security;

drop policy if exists "Users can manage own favorites" on public.favorites;
create policy "Users can manage own favorites"
  on public.favorites
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- todoist_connections (user-owned; contains access_token)
-- ---------------------------------------------------------------------------
alter table public.todoist_connections
  enable row level security;

drop policy if exists "Users can manage own todoist_connections" on public.todoist_connections;
create policy "Users can manage own todoist_connections"
  on public.todoist_connections
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- pantry (scoped by connection owner)
-- ---------------------------------------------------------------------------
alter table public.pantry
  enable row level security;

drop policy if exists "Users can manage pantry for own connections" on public.pantry;
create policy "Users can manage pantry for own connections"
  on public.pantry
  for all
  using (
    exists (
      select 1 from public.todoist_connections tc
      where tc.id = pantry.connection_id and tc.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.todoist_connections tc
      where tc.id = pantry.connection_id and tc.user_id = auth.uid()
    )
  );
