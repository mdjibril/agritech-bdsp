#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Phase 3 Migration Runner
# Applies 002_enterprise_schema.sql + 002_seed_enterprise.sql
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

MIGRATION_FILE="$PROJECT_DIR/backend/db/migrations/002_enterprise_schema.sql"
SEED_FILE="$PROJECT_DIR/backend/db/seeds/002_seed_enterprise.sql"

usage() {
  cat <<EOF
Usage: $0 [mode]

Modes:
  local       Apply migration to local Docker PostgreSQL (default)
  remote      Apply migration to DATABASE_URL from .env
  dump        Take a pg_dump backup before migrating (remote only)
  verify      Check schema was applied correctly
EOF
  exit 1
}

MODE="${1:-local}"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "ERROR: Migration file not found: $MIGRATION_FILE"
  exit 1
fi

if [ ! -f "$SEED_FILE" ]; then
  echo "ERROR: Seed file not found: $SEED_FILE"
  exit 1
fi

run_psql() {
  psql -q -v ON_ERROR_STOP=1 "$@"
}

case "$MODE" in
  local)
    echo "==> Applying Phase 3 migration to LOCAL database..."
    echo "    Migration: $MIGRATION_FILE"
    run_psql -f "$MIGRATION_FILE"
    echo "==> Migration applied successfully."
    echo "==> Seeding enterprise data..."
    run_psql -f "$SEED_FILE"
    echo "==> Seed data loaded successfully."
    ;;

  remote)
    if [ -f "$PROJECT_DIR/.env" ]; then
      set -a
      source "$PROJECT_DIR/.env"
      set +a
    fi

    if [ -z "${DATABASE_URL:-}" ]; then
      echo "ERROR: DATABASE_URL not set. Ensure .env file exists with DATABASE_URL."
      exit 1
    fi

    echo "==> Applying Phase 3 migration to REMOTE database..."
    run_psql "$DATABASE_URL" -f "$MIGRATION_FILE"
    echo "==> Migration applied successfully."
    echo "==> Seeding enterprise data..."
    run_psql "$DATABASE_URL" -f "$SEED_FILE"
    echo "==> Seed data loaded successfully."
    ;;

  dump)
    if [ -f "$PROJECT_DIR/.env" ]; then
      set -a
      source "$PROJECT_DIR/.env"
      set +a
    fi

    if [ -z "${DATABASE_URL:-}" ]; then
      echo "ERROR: DATABASE_URL not set."
      exit 1
    fi

    BACKUP_FILE="$PROJECT_DIR/backups/pre-phase-3-$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p "$PROJECT_DIR/backups"
    echo "==> Taking pg_dump backup to $BACKUP_FILE..."
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
    echo "==> Backup complete: $BACKUP_FILE"
    ;;

  verify)
    echo "==> Verifying Phase 3 schema..."
    QUERIES="
      SELECT 'actors' AS table_name, count(*) AS rows FROM actors
      UNION ALL SELECT 'transactions', count(*) FROM transactions
      UNION ALL SELECT 'escrow', count(*) FROM escrow
      UNION ALL SELECT 'loans', count(*) FROM loans
      UNION ALL SELECT 'insurance_policies', count(*) FROM insurance_policies
      UNION ALL SELECT 'training_records', count(*) FROM training_records
      UNION ALL SELECT 'activity_log', count(*) FROM activity_log;
    "

    echo "--- Table Row Counts ---"
    if [ "${2:-}" = "remote" ]; then
      echo "$QUERIES" | run_psql "$DATABASE_URL"
    else
      echo "$QUERIES" | run_psql
    fi

    echo ""
    echo "--- Actor Type Distribution ---"
    if [ "${2:-}" = "remote" ]; then
      echo "SELECT actor_type, count(*) FROM actors GROUP BY actor_type ORDER BY actor_type;" | run_psql "$DATABASE_URL"
    else
      echo "SELECT actor_type, count(*) FROM actors GROUP BY actor_type ORDER BY actor_type;" | run_psql
    fi

    echo ""
    echo "--- Indexes ---"
    if [ "${2:-}" = "remote" ]; then
      echo "SELECT indexname FROM pg_indexes WHERE tablename IN ('actors','transactions','escrow','loans','insurance_policies','training_records','activity_log') ORDER BY tablename, indexname;" | run_psql "$DATABASE_URL"
    else
      echo "SELECT indexname FROM pg_indexes WHERE tablename IN ('actors','transactions','escrow','loans','insurance_policies','training_records','activity_log') ORDER BY tablename, indexname;" | run_psql
    fi
    ;;

  *)
    usage
    ;;
esac
