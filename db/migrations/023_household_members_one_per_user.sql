-- One household per user. Concurrent first-login requests could each provision a household
-- (seen on prod), leaving a user with several memberships. The app only supports one.
-- 1) Keep each user's earliest membership; drop the rest.
delete from public.household_members m
using public.household_members keep
where keep.user_id = m.user_id
  and (keep.joined_at, keep.household_id::text) < (m.joined_at, m.household_id::text);
-- 2) Remove households left with no members AND no data (auto-provisioned duplicates).
delete from public.households h
where not exists (select 1 from public.household_members m where m.household_id = h.id)
  and not exists (select 1 from public.dishes d where d.household_id = h.id)
  and not exists (select 1 from public.meal_plans p where p.household_id = h.id)
  and not exists (select 1 from public.shopping_list_items s where s.household_id = h.id);
-- 3) Enforce it.
create unique index if not exists household_members_user_id_key on public.household_members (user_id);
