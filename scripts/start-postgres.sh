#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-agritech-bdsp-postgres}"
POSTGRES_DB="${POSTGRES_DB:-agritech_bdsp}"
POSTGRES_USER="${POSTGRES_USER:-agritech}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-agritech_dev_password}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

if docker container inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
  docker start "$CONTAINER_NAME"
else
  docker run -d \
    --name "$CONTAINER_NAME" \
    -e POSTGRES_DB="$POSTGRES_DB" \
    -e POSTGRES_USER="$POSTGRES_USER" \
    -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    -p "$POSTGRES_PORT:5432" \
    -v agritech_bdsp_postgres_data:/var/lib/postgresql/data \
    -v "$PWD/backend/db/migrations/001_init_v4v_schema.sql:/docker-entrypoint-initdb.d/001_init_v4v_schema.sql:ro" \
    -v "$PWD/backend/db/seeds/001_seed_phase_1.sql:/docker-entrypoint-initdb.d/002_seed_phase_1.sql:ro" \
    postgres:16-alpine
fi

echo "PostgreSQL container: $CONTAINER_NAME"
echo "DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:$POSTGRES_PORT/$POSTGRES_DB"
