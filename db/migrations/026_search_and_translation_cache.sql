-- Fast substring ingredient search (/api/ingredients/search uses ILIKE '%q%').
create extension if not exists pg_trgm with schema extensions;
create index if not exists idx_ingredients_name_trgm
  on public.ingredients using gin (name extensions.gin_trgm_ops);

-- Global cache of AI ingredient translations (/api/translate-ingredient).
create table if not exists public.ingredient_translations (
  ingredient text not null,
  language text not null,
  translation text not null,
  created_at timestamptz not null default now(),
  primary key (ingredient, language)
);
-- Only the service role (server) reads/writes it.
alter table public.ingredient_translations enable row level security;
