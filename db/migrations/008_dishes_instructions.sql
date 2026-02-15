-- Recipe cooking steps / instructions (e.g. from URL import)

alter table dishes
  add column if not exists instructions text;
