#!/bin/sh
set -e

# Wait for PostgreSQL to be ready (D-03)
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${POSTGRES_USER:-nextmind}"
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
attempt=0
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -q; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $MAX_RETRIES ]; then
    echo "ERROR: PostgreSQL did not become ready after ${MAX_RETRIES} attempts"
    exit 1
  fi
  echo "  Attempt ${attempt}/${MAX_RETRIES} - PostgreSQL not ready, waiting..."
  sleep $RETRY_INTERVAL
done

echo "PostgreSQL is ready. Running Drizzle migrations..."
npx drizzle-kit migrate

echo "Starting Next.js application..."
exec "$@"
