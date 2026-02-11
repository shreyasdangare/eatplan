-- Add amount and unit to dish_ingredients (for shopping list merge and portion scaling)
alter table dish_ingredients add column if not exists amount numeric;
alter table dish_ingredients add column if not exists unit text;
