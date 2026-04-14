# EatPlan Data Backup Strategy

## Current State

EatPlan uses **Supabase (PostgreSQL)** for all persistent data. Key points:

- **Data is persistent** — Supabase stores data on managed PostgreSQL infrastructure. Data survives server restarts and deployments.
- **RLS is enabled** on all tables — users can only access data within their household.
- **Supabase Free Tier** does **not** include automatic daily backups or Point-in-Time Recovery (PITR).

## Backup Options

### Option 1: Manual `pg_dump` Script (Current)

A shell script is provided at `scripts/backup-db.sh` that creates a timestamped dump of the database. Run it periodically or set up a cron job.

```bash
# One-time backup
./scripts/backup-db.sh

# Weekly cron (every Sunday at 2 AM)
0 2 * * 0 cd /path/to/eatplan && ./scripts/backup-db.sh
```

Backups are saved to the `backups/` directory (gitignored).

### Option 2: Google Cloud Storage Backup

The backup script supports uploading to Google Cloud Storage if `gsutil` is configured:

```bash
# Upload to GCS after dump
./scripts/backup-db.sh --gcs gs://your-bucket-name/eatplan-backups/
```

### Option 3: Upgrade to Supabase Pro ($25/month)

- Automatic daily backups
- Point-in-Time Recovery (PITR)
- 7-day retention (30 days on Team plan)

## What's Backed Up

| Table | Contains | Critical? |
|-------|----------|-----------|
| `dishes` | All user recipes with ingredients, tags, images | ✅ High |
| `meal_plans` | Weekly meal slot assignments | ✅ High |
| `ingredients` | Master ingredient catalog | ✅ High |
| `dish_ingredients` | Recipe-ingredient relationships | ✅ High |
| `households` | Family groupings | ✅ High |
| `household_members` | User-to-household mapping | ✅ High |
| `pantry` | User pantry items | Medium |
| `shopping_list_items` | Current shopping lists | Low |
| `llm_usage_log` | LLM API call tracking | Low |
| `favorites` | User favorites | Low |

## Recovery Steps

1. **From a `pg_dump` file:**
   ```bash
   psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" < backups/eatplan_2026-04-14.sql
   ```

2. **From Supabase Dashboard (Pro only):**
   - Go to Project → Database → Backups
   - Select a restore point

## Recommendations

For a friends & family launch:
1. ✅ Run `backup-db.sh` **weekly** (or before any migration)
2. ✅ Store backups in Google Cloud Storage for off-site safety
3. 🔜 Upgrade to Supabase Pro when user count grows beyond ~20 users
