#!/bin/sh
set -e

echo "→ Applying database migrations..."
npx prisma migrate deploy

# Seed reference data + bootstrap admin on first boot. Set SEED_ON_START=true
# in your .env for the first deploy, then flip it off (seed is idempotent, but
# skipping it speeds up restarts).
if [ "$SEED_ON_START" = "true" ]; then
  echo "→ Seeding database..."
  npm run seed || echo "⚠ seed failed (continuing startup)"
fi

echo "→ Starting Next.js on port 3000..."
exec npm run start
