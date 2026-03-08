# Multi-user setup guide (fresh start)

## Step 1: Environment variables

In `.env.local` you need:

- `NEXT_PUBLIC_SUPABASE_URL` – your Supabase project URL (same as `SUPABASE_URL`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – from Supabase Dashboard → **Project Settings** → **API** → **Project API keys** → **anon public**

After changing `.env.local`, restart the dev server (`npm run dev`).

---

## Step 2: Run the database migration

Run the migration **once** in Supabase so the app has the right tables and columns.

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Go to **SQL Editor** → **New query**.
3. Copy the **entire** contents of `db/migrations/009_multi_user.sql` from your project.
4. Paste into the SQL Editor and click **Run**.

You should see “Success. No rows returned.” That’s expected. The migration adds `user_id` to `dishes` and `meal_plans`, and creates the `favorites` table.

---

## Step 3: Enable Email auth

In Supabase: **Authentication** → **Providers** → **Email** → turn **Enable Email provider** on. You can leave “Confirm email” off for family use.

---

## Done

Restart the dev server if you changed env vars, then use the app. Each person can **Sign up** with their own email and will have their own recipes, meal plans, and shopping list. No data migration or backfill needed for a fresh start.
