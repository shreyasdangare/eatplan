-- Persistent shopping list and decouple pantry from Todoist.
-- shopping_list_items: user-owned list with to_buy/bought status.
-- pantry: add user_id so pantry works without Todoist (connection_id becomes optional).

-- ---------------------------------------------------------------------------
-- shopping_list_items
-- ---------------------------------------------------------------------------
create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ingredient_id uuid references public.ingredients (id) on delete set null,
  custom_name text,
  quantity text,
  category text,
  status text not null default 'to_buy' check (status in ('to_buy', 'bought')),
  source text not null default 'manual' check (source in ('meal_plan', 'manual')),
  urgency text not null default 'normal' check (urgency in ('normal', 'urgent', 'if_convenient')),
  notes text,
  bought_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_shopping_list_items_user_id
  on public.shopping_list_items (user_id);
create index if not exists idx_shopping_list_items_user_status
  on public.shopping_list_items (user_id, status);
create index if not exists idx_shopping_list_items_created_at
  on public.shopping_list_items (created_at);

alter table public.shopping_list_items
  enable row level security;

drop policy if exists "Users can manage own shopping_list_items" on public.shopping_list_items;
create policy "Users can manage own shopping_list_items"
  on public.shopping_list_items
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- pantry: add user_id, make connection_id nullable (decouple from Todoist)
-- Need new PK because (connection_id, ingredient_id) fails when connection_id is null.
-- ---------------------------------------------------------------------------
alter table public.pantry
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- Backfill user_id from todoist_connections for existing rows
update public.pantry p
set user_id = tc.user_id
from public.todoist_connections tc
where tc.id = p.connection_id and p.user_id is null;

-- Add id column for new primary key, backfill, then switch PK
alter table public.pantry
  add column if not exists id uuid default gen_random_uuid();
update public.pantry set id = gen_random_uuid() where id is null;
alter table public.pantry alter column id set not null;
alter table public.pantry drop constraint if exists pantry_pkey;
alter table public.pantry add primary key (id);
create unique index if not exists idx_pantry_connection_ingredient
  on public.pantry (connection_id, ingredient_id)
  where connection_id is not null;

-- Allow pantry rows without a connection (user's direct pantry)
alter table public.pantry
  alter column connection_id drop not null;

-- One row per user per ingredient when using direct pantry (connection_id null)
create unique index if not exists idx_pantry_user_ingredient_direct
  on public.pantry (user_id, ingredient_id)
  where connection_id is null;

create index if not exists idx_pantry_user_id on public.pantry (user_id);

-- RLS: allow access by user_id (covers both connection-linked and direct pantry)
drop policy if exists "Users can manage pantry for own connections" on public.pantry;
create policy "Users can manage pantry for own connections"
  on public.pantry
  for all
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.todoist_connections tc
      where tc.id = pantry.connection_id and tc.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.todoist_connections tc
      where tc.id = pantry.connection_id and tc.user_id = auth.uid()
    )
  );
