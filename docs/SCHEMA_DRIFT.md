# Schema drift: repo vs production (found 2026-10-15)

`db/schema.sql` has been regenerated from production (rndmugyfzbzdzjzxzphj) after migrations 020–022. It loads cleanly into an empty Postgres (checked with PGlite, using stub `auth` schema and roles). Result: 9 tables, 12 policies, 26 indexes.

## What drifted
- **Old `db/schema.sql`** was the pre-multi-user v1. It had `dishes`, `ingredients`, `dish_ingredients`, `meal_plans`, `pantry`, and no households, favorites, shopping list, LLM log, RLS or functions.
- **Migrations 001–019 don't replay** from scratch. 012 creates policies on `pantry.connection_id` / `todoist_connections`, but 005/013/015 add and drop those objects in an order that breaks on a fresh database (`column "connection_id" does not exist`). Production was evidently built by applying them by hand. Production's migration history only records 020–022.
- **`pantry` table: not in production.** `app/api/pantry/route.ts` and the pantry page query it, so the pantry feature can't work in production today. That's consistent with pantry being on hold. Re-introducing it needs a new migration.
- **`todoist_connections`: not in production** (expected, since Todoist is deprecated).
- **Per-user `user_id` columns** from 009 (on dishes, meal_plans, etc.) aren't in production. Ownership is per household (`household_id`), added in 016. Only `favorites` and `llm_usage_log` are keyed by `user_id`.
- **RLS:** before 022, every household policy recursed through `household_members` (error 42P17) for any user-JWT query. The app only worked because API routes use the service role. Fixed by 022.
- **Extra objects in production not in the repo:** a public storage bucket `dish-images`. Extensions: pg_stat_statements, uuid-ossp, pgcrypto, supabase_vault (Supabase defaults).

## Going forward
- New databases: apply `db/schema.sql`, then any migrations numbered above 022.
- Apply new changes as numbered migrations through Supabase migrations, so `list_migrations` stays authoritative.
