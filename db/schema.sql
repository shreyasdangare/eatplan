-- EatPlan database baseline, generated from PRODUCTION (rndmugyfzbzdzjzxzphj) on 2026-10-15
-- after migrations 020-022 were applied. Use this file for a fresh database.
-- db/migrations/001-019 are history and do NOT replay cleanly (see docs/SCHEMA_DRIFT.md).
-- Extensions present: plpgsql, pg_stat_statements, uuid-ossp, pgcrypto, supabase_vault. Storage bucket: dish-images (public).

create extension if not exists pgcrypto;
create schema if not exists private;

create table public.households (
  id uuid not null default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone not null default now(),
  constraint households_pkey PRIMARY KEY (id)
);

create table public.household_members (
  household_id uuid not null,
  user_id uuid not null,
  role text not null default 'member'::text,
  joined_at timestamp with time zone not null default now(),
  constraint household_members_pkey PRIMARY KEY (household_id, user_id),
  constraint household_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
);

create table public.ingredients (
  id uuid not null default gen_random_uuid(),
  name text not null,
  category text,
  created_at timestamp with time zone not null default now(),
  constraint ingredients_name_key UNIQUE (name),
  constraint ingredients_pkey PRIMARY KEY (id)
);

create table public.dishes (
  id uuid not null default gen_random_uuid(),
  name text not null,
  description text,
  meal_type text,
  prep_time_minutes integer,
  tags text[],
  created_at timestamp with time zone not null default now(),
  image_url text,
  servings integer,
  instructions text,
  household_id uuid,
  constraint dishes_pkey PRIMARY KEY (id),
  constraint dishes_meal_type_check CHECK ((meal_type = ANY (ARRAY['lunch'::text, 'dinner'::text, 'both'::text])))
);

create table public.dish_ingredients (
  id uuid not null default gen_random_uuid(),
  dish_id uuid not null,
  ingredient_id uuid not null,
  quantity text,
  is_optional boolean not null default false,
  amount numeric,
  unit text,
  constraint dish_ingredients_pkey PRIMARY KEY (id)
);

create table public.favorites (
  user_id uuid not null,
  dish_id uuid not null,
  constraint favorites_pkey PRIMARY KEY (user_id, dish_id)
);

create table public.meal_plans (
  id uuid not null default gen_random_uuid(),
  date date not null,
  slot_type text not null,
  dish_id uuid,
  created_at timestamp with time zone not null default now(),
  prepared_at timestamp with time zone,
  household_id uuid,
  "position" integer not null default 0,
  constraint meal_plans_household_date_slot_pos_unique UNIQUE (household_id, date, slot_type, "position"),
  constraint meal_plans_pkey PRIMARY KEY (id),
  constraint meal_plans_slot_type_check CHECK ((slot_type = ANY (ARRAY['breakfast'::text, 'lunch'::text, 'dinner'::text])))
);

create table public.shopping_list_items (
  id uuid not null default gen_random_uuid(),
  ingredient_id uuid,
  custom_name text,
  quantity text,
  category text,
  status text not null default 'to_buy'::text,
  source text not null default 'manual'::text,
  urgency text not null default 'normal'::text,
  notes text,
  bought_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  "position" integer,
  household_id uuid,
  constraint shopping_list_items_pkey PRIMARY KEY (id),
  constraint shopping_list_items_source_check CHECK ((source = ANY (ARRAY['meal_plan'::text, 'manual'::text]))),
  constraint shopping_list_items_status_check CHECK ((status = ANY (ARRAY['to_buy'::text, 'bought'::text]))),
  constraint shopping_list_items_urgency_check CHECK ((urgency = ANY (ARRAY['normal'::text, 'urgent'::text, 'if_convenient'::text])))
);

create table public.llm_usage_log (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  household_id uuid,
  endpoint text not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  created_at timestamp with time zone not null default now(),
  constraint llm_usage_log_pkey PRIMARY KEY (id)
);

alter table public.household_members add constraint household_members_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;
alter table public.household_members add constraint household_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.dishes add constraint dishes_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;
alter table public.dish_ingredients add constraint dish_ingredients_dish_id_fkey FOREIGN KEY (dish_id) REFERENCES public.dishes(id) ON DELETE CASCADE;
alter table public.dish_ingredients add constraint dish_ingredients_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE RESTRICT;
alter table public.favorites add constraint favorites_dish_id_fkey FOREIGN KEY (dish_id) REFERENCES public.dishes(id) ON DELETE CASCADE;
alter table public.favorites add constraint favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.meal_plans add constraint meal_plans_dish_id_fkey FOREIGN KEY (dish_id) REFERENCES public.dishes(id) ON DELETE SET NULL;
alter table public.meal_plans add constraint meal_plans_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;
alter table public.shopping_list_items add constraint shopping_list_items_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;
alter table public.shopping_list_items add constraint shopping_list_items_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE SET NULL;
alter table public.llm_usage_log add constraint llm_usage_log_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE SET NULL;
alter table public.llm_usage_log add constraint llm_usage_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_dish_ingredients_dish_id ON public.dish_ingredients USING btree (dish_id);
CREATE INDEX idx_dish_ingredients_ingredient_id ON public.dish_ingredients USING btree (ingredient_id);
CREATE INDEX idx_dishes_household_id ON public.dishes USING btree (household_id);
CREATE INDEX idx_favorites_dish_id ON public.favorites USING btree (dish_id);
CREATE INDEX idx_favorites_user_id ON public.favorites USING btree (user_id);
CREATE INDEX idx_household_members_household_id ON public.household_members USING btree (household_id);
CREATE INDEX idx_household_members_user_id ON public.household_members USING btree (user_id);
CREATE INDEX idx_llm_usage_created ON public.llm_usage_log USING btree (created_at);
CREATE INDEX idx_llm_usage_log_household_id ON public.llm_usage_log USING btree (household_id);
CREATE INDEX idx_llm_usage_user ON public.llm_usage_log USING btree (user_id);
CREATE INDEX idx_meal_plans_date ON public.meal_plans USING btree (date);
CREATE INDEX idx_meal_plans_dish_id ON public.meal_plans USING btree (dish_id);
CREATE INDEX idx_shopping_list_items_created_at ON public.shopping_list_items USING btree (created_at);
CREATE INDEX idx_shopping_list_items_household_id ON public.shopping_list_items USING btree (household_id);
CREATE INDEX idx_shopping_list_items_ingredient_id ON public.shopping_list_items USING btree (ingredient_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.ingredients enable row level security;
alter table public.dishes enable row level security;
alter table public.dish_ingredients enable row level security;
alter table public.favorites enable row level security;
alter table public.meal_plans enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.llm_usage_log enable row level security;

-- Functions
CREATE OR REPLACE FUNCTION private.my_admin_household_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select household_id from public.household_members where user_id = (select auth.uid()) and role = 'admin'
$function$;

CREATE OR REPLACE FUNCTION private.my_household_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select household_id from public.household_members where user_id = (select auth.uid())
$function$;

CREATE OR REPLACE FUNCTION public.batch_reorder_shopping_list(p_household_id uuid, p_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.shopping_list_items sli
  set position = (item->>'position')::int
  from jsonb_array_elements(p_items) as item
  where sli.id = (item->>'id')::uuid
    and sli.household_id = p_household_id
    and sli.status = 'to_buy';
end;
$function$;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
revoke all on function private.my_household_ids() from public, anon;
revoke all on function private.my_admin_household_ids() from public, anon;
grant execute on function private.my_household_ids() to authenticated, service_role;
grant execute on function private.my_admin_household_ids() to authenticated, service_role;
revoke execute on function public.batch_reorder_shopping_list(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.batch_reorder_shopping_list(uuid, jsonb) to service_role;

-- Policies
create policy "Household members can manage dish_ingredients" on public.dish_ingredients as permissive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM dishes d
  WHERE ((d.id = dish_ingredients.dish_id) AND (d.household_id IN ( SELECT private.my_household_ids() AS my_household_ids))))))
  with check ((EXISTS ( SELECT 1
   FROM dishes d
  WHERE ((d.id = dish_ingredients.dish_id) AND (d.household_id IN ( SELECT private.my_household_ids() AS my_household_ids))))));
create policy "Household members can manage dishes" on public.dishes as permissive for all to authenticated
  using ((household_id IN ( SELECT private.my_household_ids() AS my_household_ids)))
  with check ((household_id IN ( SELECT private.my_household_ids() AS my_household_ids)));
create policy "Users can manage own favorites" on public.favorites as permissive for all to authenticated
  using ((user_id = ( SELECT auth.uid() AS uid)))
  with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Admins can add household members" on public.household_members as permissive for insert to authenticated
  with check ((household_id IN ( SELECT private.my_admin_household_ids() AS my_admin_household_ids)));
create policy "Admins can remove household members" on public.household_members as permissive for delete to authenticated
  using ((household_id IN ( SELECT private.my_admin_household_ids() AS my_admin_household_ids)));
create policy "Admins can update household members" on public.household_members as permissive for update to authenticated
  using ((household_id IN ( SELECT private.my_admin_household_ids() AS my_admin_household_ids)))
  with check ((household_id IN ( SELECT private.my_admin_household_ids() AS my_admin_household_ids)));
create policy "Members can view household members" on public.household_members as permissive for select to authenticated
  using ((household_id IN ( SELECT private.my_household_ids() AS my_household_ids)));
create policy "Admins can update their households" on public.households as permissive for update to authenticated
  using ((id IN ( SELECT private.my_admin_household_ids() AS my_admin_household_ids)))
  with check ((id IN ( SELECT private.my_admin_household_ids() AS my_admin_household_ids)));
create policy "Members can view their households" on public.households as permissive for select to authenticated
  using ((id IN ( SELECT private.my_household_ids() AS my_household_ids)));
create policy "Authenticated users can read ingredients" on public.ingredients as permissive for select to authenticated
  using (true);
create policy "Household members can manage meal_plans" on public.meal_plans as permissive for all to authenticated
  using ((household_id IN ( SELECT private.my_household_ids() AS my_household_ids)))
  with check ((household_id IN ( SELECT private.my_household_ids() AS my_household_ids)));
create policy "Household members can manage shopping_list_items" on public.shopping_list_items as permissive for all to authenticated
  using ((household_id IN ( SELECT private.my_household_ids() AS my_household_ids)))
  with check ((household_id IN ( SELECT private.my_household_ids() AS my_household_ids)));
