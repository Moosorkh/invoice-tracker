#!/bin/bash
set -e

echo "🔧 Running database migrations..."
cd server
timeout 30s npx prisma migrate resolve --applied 20260119061951_enhance_portal_auth_tokens || echo "⏭️  Skipped migration resolve"
timeout 30s npx prisma migrate deploy || echo "⚠️  Migrations timed out or failed - starting servers anyway"

echo "🚀 Starting Express server with Next.js build on port ${PORT:-5000}..."
node dist/index.js
