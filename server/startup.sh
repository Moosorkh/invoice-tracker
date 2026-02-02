#!/bin/bash
set -e

echo "� Starting server (migrations will run in background)..."

# Start server immediately
node dist/index.js &
SERVER_PID=$!

# Run migrations in background
(
  sleep 2
  echo "🔧 Running database migrations..."
  npx prisma migrate resolve --applied 20260119061951_enhance_portal_auth_tokens || true
  npx prisma migrate deploy && echo "✅ Migrations completed" || echo "⚠️  Migrations failed"
) &

# Wait for server process
wait $SERVER_PID
