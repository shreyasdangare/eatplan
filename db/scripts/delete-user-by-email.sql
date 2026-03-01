-- Delete a Supabase Auth user by email (for use in Supabase Dashboard → SQL Editor).
--
-- 1. Replace 'user@example.com' below with the actual email.
-- 2. Run this in Supabase: SQL Editor → New query → paste → Run.
--
-- Why this can't also delete Storage files:
-- Supabase Storage keeps the actual files in object storage (e.g. S3), not in Postgres.
-- The storage.objects table is only metadata; deleting rows there would orphan the real
-- files and you'd still be billed. Only the Storage API (remove()) actually deletes
-- files. The SQL editor can't call that API, so for full cleanup including the
-- dish-images bucket use: npm run delete-user -- user@example.com
--
-- This script removes the user from auth; your public tables (dishes, meal_plans,
-- favorites, todoist_connections, pantry) cascade automatically. If the user has
-- objects in Storage, auth delete may fail—use the npm script to clear storage first.

do $$
declare
  target_email text := 'user@example.com';  -- ← Change this to the user's email
  uid uuid;
begin
  select id into uid from auth.users where email = target_email;
  if uid is null then
    raise exception 'No user found with email: %', target_email;
  end if;

  -- Delete identities first (auth.identities references auth.users)
  delete from auth.identities where user_id = uid;

  -- Delete the user (cascades to your public tables via FK)
  delete from auth.users where id = uid;

  raise notice 'Deleted user % (id: %)', target_email, uid;
end $$;
