-- 016_households.sql
-- Enables collaborative household planning by migrating user_id to household_id.

-- 1. Create Households schema
CREATE TABLE IF NOT EXISTS public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_household_members_user_id on public.household_members (user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household_id on public.household_members (household_id);

-- 2. Add household_id columns
ALTER TABLE public.dishes ADD COLUMN IF NOT EXISTS household_id uuid references public.households(id) on delete cascade;
ALTER TABLE public.meal_plans ADD COLUMN IF NOT EXISTS household_id uuid references public.households(id) on delete cascade;
ALTER TABLE public.shopping_list_items ADD COLUMN IF NOT EXISTS household_id uuid references public.households(id) on delete cascade;
ALTER TABLE public.pantry ADD COLUMN IF NOT EXISTS household_id uuid references public.households(id) on delete cascade;

-- 3. Backfill data: create a household for every user and map their data
DO $$
DECLARE
  u record;
  new_h_id uuid;
BEGIN
  -- Find all unique users who own data
  FOR u IN SELECT DISTINCT user_id FROM (
    SELECT user_id FROM public.dishes WHERE user_id IS NOT NULL
    UNION
    SELECT user_id FROM public.meal_plans WHERE user_id IS NOT NULL
    UNION
    SELECT user_id FROM public.shopping_list_items WHERE user_id IS NOT NULL
    UNION
    SELECT user_id FROM public.pantry WHERE user_id IS NOT NULL
  ) combined LOOP
    
    -- Create their household
    new_h_id := gen_random_uuid();
    INSERT INTO public.households (id, name) VALUES (new_h_id, 'My Household');
    
    -- Insert user as admin
    INSERT INTO public.household_members (household_id, user_id, role) 
      VALUES (new_h_id, u.user_id, 'admin') 
      ON CONFLICT DO NOTHING;
    
    -- Update all their data rows to use the new household
    UPDATE public.dishes SET household_id = new_h_id WHERE user_id = u.user_id;
    UPDATE public.meal_plans SET household_id = new_h_id WHERE user_id = u.user_id;
    UPDATE public.shopping_list_items SET household_id = new_h_id WHERE user_id = u.user_id;
    UPDATE public.pantry SET household_id = new_h_id WHERE user_id = u.user_id;

  END LOOP;
END $$;

-- 4. Clean up old user_id columns & indexes
ALTER TABLE public.dishes DROP COLUMN IF EXISTS user_id CASCADE;

ALTER TABLE public.meal_plans DROP CONSTRAINT IF EXISTS meal_plans_user_date_slot_unique;
ALTER TABLE public.meal_plans DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE public.meal_plans ADD CONSTRAINT meal_plans_household_date_slot_unique UNIQUE (household_id, date, slot_type);

ALTER TABLE public.shopping_list_items DROP COLUMN IF EXISTS user_id CASCADE;

DROP INDEX IF EXISTS idx_pantry_user_id;
DROP INDEX IF EXISTS idx_pantry_user_ingredient_direct;
ALTER TABLE public.pantry DROP COLUMN IF EXISTS user_id CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pantry_household_ingredient
  ON public.pantry (household_id, ingredient_id);

-- 5. Revise Row-Level Security
-- Drop outdated policies
DROP POLICY IF EXISTS "Users can manage own dishes" ON public.dishes;
DROP POLICY IF EXISTS "Users can manage dish_ingredients for own dishes" ON public.dish_ingredients;
DROP POLICY IF EXISTS "Users can manage own meal_plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can manage own shopping_list_items" ON public.shopping_list_items;
DROP POLICY IF EXISTS "Users can manage pantry for own connections" ON public.pantry;
DROP POLICY IF EXISTS "Users can manage own pantry" ON public.pantry;

-- Create secure household policies
CREATE POLICY "Household members can manage dishes" ON public.dishes
  FOR ALL USING (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

CREATE POLICY "Household members can manage dish_ingredients" ON public.dish_ingredients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.dishes d 
      WHERE d.id = dish_ingredients.dish_id AND d.household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Household members can manage meal_plans" ON public.meal_plans
  FOR ALL USING (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

CREATE POLICY "Household members can manage shopping_list_items" ON public.shopping_list_items
  FOR ALL USING (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

CREATE POLICY "Household members can manage pantry" ON public.pantry
  FOR ALL USING (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

-- Protect households via RLS
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their households" ON public.households
  FOR SELECT USING (id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));
CREATE POLICY "Admins can update their households" ON public.households
  FOR UPDATE USING (
    id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid() AND role = 'admin')
  );

ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view household members" ON public.household_members
  FOR SELECT USING (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage household members" ON public.household_members
  FOR ALL USING (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid() AND role = 'admin')
  );
