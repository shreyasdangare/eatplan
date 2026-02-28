-- Multi-user: add user_id to user-owned tables and create favorites table.
-- Run after Supabase Auth is in use. Backfill: after first user signs up, set their auth.users.id
-- on existing rows, then run 010_multi_user_not_null.sql to set NOT NULL.

-- dishes: owned by user
alter table dishes
  add column if not exists user_id uuid references auth.users (id) on delete cascade;
create index if not exists idx_dishes_user_id on dishes (user_id);

-- meal_plans: one slot per user per date
alter table meal_plans
  add column if not exists user_id uuid references auth.users (id) on delete cascade;
create index if not exists idx_meal_plans_user_id on meal_plans (user_id);
alter table meal_plans
  drop constraint if exists meal_plans_date_slot_type_key;
alter table meal_plans
  add constraint meal_plans_user_date_slot_unique unique (user_id, date, slot_type);

-- todoist_connections: one per user (optional)
alter table todoist_connections
  add column if not exists user_id uuid references auth.users (id) on delete cascade;
create index if not exists idx_todoist_connections_user_id on todoist_connections (user_id);

-- favorites: user <-> dish (replaces localStorage)
create table if not exists favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  dish_id uuid not null references dishes (id) on delete cascade,
  primary key (user_id, dish_id)
);
create index if not exists idx_favorites_user_id on favorites (user_id);
