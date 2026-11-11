-- NOT YET APPLIED TO PRODUCTION. Apply at merge time of the free grocery flow PR.
-- Remembered products: the product page a household buys for an ingredient at a store
-- (e.g. a pasted ah.nl product link). The weekly grocery list opens it directly instead of a search.
-- Public links only; no store accounts or APIs involved.

create table if not exists public.grocery_product_links (
  household_id uuid not null references public.households (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  store text not null check (store in ('ah', 'jumbo', 'blinkit', 'zepto', 'swiggy')),
  url text not null check (url ~ '^https://' and char_length(url) <= 500),
  updated_at timestamptz not null default now(),
  primary key (household_id, ingredient_id, store)
);

-- The primary key covers household_id lookups; this one covers the ingredient FK (cascade deletes).
create index if not exists idx_grocery_product_links_ingredient_id
  on public.grocery_product_links (ingredient_id);

alter table public.grocery_product_links enable row level security;
revoke all on table public.grocery_product_links from anon;

-- Same pattern as the other household tables (022): membership via the SECURITY DEFINER helper,
-- wrapped in a sub-select so it is evaluated once per statement, and scoped TO authenticated.
drop policy if exists "Household members can manage grocery_product_links" on public.grocery_product_links;
create policy "Household members can manage grocery_product_links"
  on public.grocery_product_links for all to authenticated
  using (household_id in (select private.my_household_ids()))
  with check (household_id in (select private.my_household_ids()));
