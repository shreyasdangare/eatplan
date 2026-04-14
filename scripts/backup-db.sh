#!/bin/bash
# EatPlan Database Backup Script
# Usage: ./scripts/backup-db.sh [--gcs gs://bucket/path/]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="eatplan_${TIMESTAMP}.sql"

# Load env vars
if [ -f "$PROJECT_DIR/.env.local" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env.local" | xargs)
fi

# Extract database connection from SUPABASE_URL
SUPABASE_URL="${SUPABASE_URL:-}"
if [ -z "$SUPABASE_URL" ]; then
  echo "❌ SUPABASE_URL not set. Check .env.local"
  exit 1
fi

# Build the direct Postgres connection string
# Supabase URLs are like: https://XXXX.supabase.co
# Direct DB connection: postgresql://postgres:[service_role_key]@db.XXXX.supabase.co:5432/postgres
PROJECT_REF=$(echo "$SUPABASE_URL" | sed -n 's|https://\(.*\)\.supabase\.co|\1|p')
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [ -z "$PROJECT_REF" ] || [ -z "$SERVICE_KEY" ]; then
  echo "❌ Cannot extract project ref or service key. Check .env.local"
  exit 1
fi

DB_URL="postgresql://postgres.${PROJECT_REF}:${SERVICE_KEY}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "🗃️  Starting EatPlan database backup..."
echo "   Timestamp: $TIMESTAMP"
echo "   Output: $BACKUP_DIR/$BACKUP_FILE"

# Run pg_dump
pg_dump "$DB_URL" \
  --no-owner \
  --no-privileges \
  --schema=public \
  --format=plain \
  > "$BACKUP_DIR/$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
echo "✅ Backup complete: $BACKUP_FILE ($FILESIZE)"

# Compress
gzip "$BACKUP_DIR/$BACKUP_FILE"
echo "📦 Compressed: ${BACKUP_FILE}.gz"

# Optional: upload to Google Cloud Storage
GCS_PATH=""
for arg in "$@"; do
  case $arg in
    --gcs)
      shift
      GCS_PATH="$1"
      shift
      ;;
    --gcs=*)
      GCS_PATH="${arg#*=}"
      shift
      ;;
  esac
done

if [ -n "$GCS_PATH" ]; then
  if command -v gsutil &> /dev/null; then
    echo "☁️  Uploading to Google Cloud Storage: ${GCS_PATH}"
    gsutil cp "$BACKUP_DIR/${BACKUP_FILE}.gz" "${GCS_PATH}${BACKUP_FILE}.gz"
    echo "✅ Uploaded to GCS"
  else
    echo "⚠️  gsutil not found. Install Google Cloud SDK to enable GCS uploads."
    echo "   https://cloud.google.com/sdk/docs/install"
  fi
fi

# Clean up old local backups (keep last 10)
cd "$BACKUP_DIR"
ls -1t eatplan_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm --
echo "🧹 Old backups cleaned up (keeping last 10)"

echo ""
echo "Done! 🎉"
