-- Run AFTER backfilling existing rows with the owner's auth.users.id.
-- Backfill example (run in Supabase SQL editor after first user signs up):
--   update dishes set user_id = (select id from auth.users limit 1) where user_id is null;
--   update meal_plans set user_id = (select id from auth.users limit 1) where user_id is null;
--   update todoist_connections set user_id = (select id from auth.users limit 1) where user_id is null;

alter table dishes
  alter column user_id set not null;

alter table meal_plans
  alter column user_id set not null;

alter table todoist_connections
  alter column user_id set not null;
