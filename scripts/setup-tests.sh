#!/bin/bash
set -euo pipefail

# Install Node dependencies using pnpm
pnpm install --frozen-lockfile

# Generate Prisma client for the backend
pnpm --filter backend exec npx prisma generate

# Start required services for tests
if command -v docker >/dev/null 2>&1; then
  docker compose up -d db redis
fi

# Initialize test database
DATABASE_URL="${DATABASE_URL:-postgresql://appuser:secret@localhost:5432/app_test}"
export DATABASE_URL
db_ready=true
if pnpm --filter backend exec npx prisma db push; then
  echo "Database ready"
else
  db_ready=false
  echo "⚠️  Skipping database initialization (database not reachable)"
fi

# Run integration tests only if the database is available
if [ "$db_ready" = true ]; then
  pnpm --filter backend exec vitest run --mode test --config vitest.integration.config.ts
  echo "✅ Integration tests complete."
else
  echo "⚠️  Integration tests skipped" >&2
fi
