-- Optional: clear all user-owned data for a fresh start. Run once in Supabase SQL Editor.
-- CASCADE truncates dependent tables too. Ingredients are kept (shared catalog).

truncate table dishes cascade;
truncate table todoist_connections cascade;
