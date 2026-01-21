#!/bin/sh
# Resolve any failed migrations first
echo "Resolving failed migrations..."
npx prisma migrate resolve --applied 20260119061951_enhance_portal_auth_tokens || true
echo "Running database migrations..."
npx prisma migrate deploy
echo "Starting application..."
npm start