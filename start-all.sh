#!/bin/bash
set -e

echo "🔧 Running database migrations..."
cd server
npx prisma migrate deploy

echo "🚀 Starting Express server with Next.js build on port ${PORT:-5000}..."
node dist/index.js
