-- Pantry: optional amount and unit per ingredient

alter table pantry
  add column if not exists amount numeric,
  add column if not exists unit text;
