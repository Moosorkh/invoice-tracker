#!/bin/sh
# Run migrations before starting the app
echo "Running database migrations..."
npx prisma migrate deploy
echo "Starting application..."
npm start