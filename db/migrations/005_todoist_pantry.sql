-- Todoist connections (OAuth tokens) and pantry per connection

create table if not exists todoist_connections (
  id uuid primary key default gen_random_uuid(),
  access_token text not null unique,
  project_id text,
  created_at timestamptz not null default now()
);

create table if not exists pantry (
  connection_id uuid not null references todoist_connections (id) on delete cascade,
  ingredient_id uuid not null references ingredients (id) on delete cascade,
  primary key (connection_id, ingredient_id)
);

create index if not exists idx_pantry_connection_id on pantry (connection_id);
