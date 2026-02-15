#!/bin/bash
set -e

echo "🔧 Running database migrations..."
cd server
npx prisma migrate resolve --rolled-back 20260202063354_add_rbac_and_audit_logs || echo "Migration already resolved"
npx prisma migrate deploy

echo "🚀 Starting Express server on port ${PORT:-5000}..."
node dist/index.js
