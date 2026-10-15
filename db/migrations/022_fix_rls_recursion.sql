-- NOT YET APPLIED TO PRODUCTION. Apply after 021.
-- Fixes "infinite recursion detected in policy for relation household_members" (42P17):
-- every household-scoped policy queried household_members, whose own policies query
-- household_members again. As a result, ANY query made with a user JWT (not service role)
-- on these tables errors in production today. The app only works because API routes use
-- the service-role key.
-- Fix: membership lookups go through SECURITY DEFINER helpers in a non-exposed schema
-- (bypass RLS on household_members, no recursion). Policies are scoped TO authenticated,
-- so anon gets nothing. household_members admin policy is split per command, so SELECT
-- has a single permissive policy.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.my_household_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select household_id from public.household_members where user_id = (select auth.uid())
$$;
create or replace function private.my_admin_household_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select household_id from public.household_members where user_id = (select auth.uid()) and role = 'admin'
$$;
revoke all on function private.my_household_ids() from public, anon;
revoke all on function private.my_admin_household_ids() from public, anon;
grant execute on function private.my_household_ids() to authenticated, service_role;
grant execute on function private.my_admin_household_ids() to authenticated, service_role;

begin;
drop policy if exists "Household members can manage dishes" on public.dishes;
create policy "Household members can manage dishes" on public.dishes for all to authenticated
  using (household_id in (select private.my_household_ids()))
  with check (household_id in (select private.my_household_ids()));

drop policy if exists "Household members can manage dish_ingredients" on public.dish_ingredients;
create policy "Household members can manage dish_ingredients" on public.dish_ingredients for all to authenticated
  using (exists (select 1 from public.dishes d where d.id = dish_ingredients.dish_id and d.household_id in (select private.my_household_ids())))
  with check (exists (select 1 from public.dishes d where d.id = dish_ingredients.dish_id and d.household_id in (select private.my_household_ids())));

drop policy if exists "Household members can manage meal_plans" on public.meal_plans;
create policy "Household members can manage meal_plans" on public.meal_plans for all to authenticated
  using (household_id in (select private.my_household_ids()))
  with check (household_id in (select private.my_household_ids()));

drop policy if exists "Household members can manage shopping_list_items" on public.shopping_list_items;
create policy "Household members can manage shopping_list_items" on public.shopping_list_items for all to authenticated
  using (household_id in (select private.my_household_ids()))
  with check (household_id in (select private.my_household_ids()));

drop policy if exists "Users can manage own favorites" on public.favorites;
create policy "Users can manage own favorites" on public.favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Members can view their households" on public.households;
create policy "Members can view their households" on public.households for select to authenticated
  using (id in (select private.my_household_ids()));
drop policy if exists "Admins can update their households" on public.households;
create policy "Admins can update their households" on public.households for update to authenticated
  using (id in (select private.my_admin_household_ids()))
  with check (id in (select private.my_admin_household_ids()));

drop policy if exists "Members can view household members" on public.household_members;
drop policy if exists "Admins can manage household members" on public.household_members;
create policy "Members can view household members" on public.household_members for select to authenticated
  using (household_id in (select private.my_household_ids()));
create policy "Admins can add household members" on public.household_members for insert to authenticated
  with check (household_id in (select private.my_admin_household_ids()));
create policy "Admins can update household members" on public.household_members for update to authenticated
  using (household_id in (select private.my_admin_household_ids()))
  with check (household_id in (select private.my_admin_household_ids()));
create policy "Admins can remove household members" on public.household_members for delete to authenticated
  using (household_id in (select private.my_admin_household_ids()));
commit;

-- Rollback: re-create the previous policies from 021 (or 012/016) and
-- drop function private.my_household_ids(); drop function private.my_admin_household_ids();
