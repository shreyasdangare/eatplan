-- 019_multi_dish_slots.sql
-- Allows multiple dishes per meal slot by adding a position column.
-- Max 5 dishes per slot is enforced at the application layer.

-- Add position column for ordering within a slot
ALTER TABLE public.meal_plans ADD COLUMN IF NOT EXISTS position int NOT NULL DEFAULT 0;

-- Drop old unique constraint (one dish per slot) and add new one (one dish per position in slot)
ALTER TABLE public.meal_plans DROP CONSTRAINT IF EXISTS meal_plans_household_date_slot_unique;
ALTER TABLE public.meal_plans ADD CONSTRAINT meal_plans_household_date_slot_pos_unique
  UNIQUE (household_id, date, slot_type, position);
