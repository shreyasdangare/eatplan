-- Meal plan slot: mark when meal was prepared (for pantry deduction)

alter table meal_plans
  add column if not exists prepared_at timestamptz;
