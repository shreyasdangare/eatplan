create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  slot_type text not null check (slot_type in ('breakfast', 'lunch', 'dinner')),
  dish_id uuid references dishes (id) on delete set null,
  created_at timestamptz not null default now(),
  unique(date, slot_type)
);

create index if not exists idx_meal_plans_date on meal_plans (date);
