-- Supabase / Postgres schema for Jevan

create table if not exists dishes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  meal_type text check (meal_type in ('lunch', 'dinner', 'both')),
  prep_time_minutes integer,
  tags text[],
  image_url text,
  servings integer,
  created_at timestamptz not null default now()
);

create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists dish_ingredients (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references dishes (id) on delete cascade,
  ingredient_id uuid not null references ingredients (id) on delete restrict,
  quantity text,
  amount numeric,
  unit text,
  is_optional boolean not null default false
);

create index if not exists idx_dish_ingredients_dish_id
  on dish_ingredients (dish_id);

create index if not exists idx_dish_ingredients_ingredient_id
  on dish_ingredients (ingredient_id);

create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  slot_type text not null check (slot_type in ('breakfast', 'lunch', 'dinner')),
  dish_id uuid references dishes (id) on delete set null,
  created_at timestamptz not null default now(),
  unique(date, slot_type)
);

create index if not exists idx_meal_plans_date on meal_plans (date);

