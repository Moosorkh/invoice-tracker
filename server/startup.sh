#!/bin/bash
set -e

echo "🔧 Running database migrations (with timeout)..."

# Run migrations with timeout - don't block forever
timeout 30s npx prisma migrate resolve --applied 20260119061951_enhance_portal_auth_tokens || echo "⏭️  Skipped migration resolve"
timeout 30s npx prisma migrate deploy || echo "⚠️  Migrations timed out or failed - starting server anyway"

echo "🚀 Starting server..."
exec node dist/index.js
