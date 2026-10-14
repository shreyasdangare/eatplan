-- NOT YET APPLIED. Review, then apply via Supabase migrations.
-- Fixes performance advisors:
--   unindexed_foreign_keys (6) and auth_rls_initplan (9: wrap auth.uid() in a
--   scalar subquery so it is evaluated once per statement, not per row).
-- Policy logic is unchanged; only auth.uid() -> (select auth.uid()).
-- Unused-index and multiple_permissive_policies findings are left for later
-- (low traffic makes "unused" unreliable; household_members policy overlap
-- needs a deliberate redesign).

create index if not exists idx_dishes_household_id on public.dishes (household_id);
create index if not exists idx_favorites_dish_id on public.favorites (dish_id);
create index if not exists idx_llm_usage_log_household_id on public.llm_usage_log (household_id);
create index if not exists idx_meal_plans_dish_id on public.meal_plans (dish_id);
create index if not exists idx_shopping_list_items_household_id on public.shopping_list_items (household_id);
create index if not exists idx_shopping_list_items_ingredient_id on public.shopping_list_items (ingredient_id);

begin;

alter policy "Users can manage own favorites" on public.favorites
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy "Household members can manage dishes" on public.dishes
  using (household_id in (select hm.household_id from public.household_members hm where hm.user_id = (select auth.uid())));

alter policy "Household members can manage dish_ingredients" on public.dish_ingredients
  using (exists (select 1 from public.dishes d where d.id = dish_ingredients.dish_id
    and d.household_id in (select hm.household_id from public.household_members hm where hm.user_id = (select auth.uid()))));

alter policy "Household members can manage meal_plans" on public.meal_plans
  using (household_id in (select hm.household_id from public.household_members hm where hm.user_id = (select auth.uid())));

alter policy "Household members can manage shopping_list_items" on public.shopping_list_items
  using (household_id in (select hm.household_id from public.household_members hm where hm.user_id = (select auth.uid())));

alter policy "Members can view their households" on public.households
  using (id in (select hm.household_id from public.household_members hm where hm.user_id = (select auth.uid())));

alter policy "Admins can update their households" on public.households
  using (id in (select hm.household_id from public.household_members hm where hm.user_id = (select auth.uid()) and hm.role = 'admin'));

alter policy "Members can view household members" on public.household_members
  using (household_id in (select hm.household_id from public.household_members hm where hm.user_id = (select auth.uid())));

alter policy "Admins can manage household members" on public.household_members
  using (household_id in (select hm.household_id from public.household_members hm where hm.user_id = (select auth.uid()) and hm.role = 'admin'));

commit;
