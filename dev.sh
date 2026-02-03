#!/bin/bash

# Development mode - run both servers

echo "Starting development servers..."
echo "API will run on: http://localhost:5000"
echo "Next.js will run on: http://localhost:3000"
echo ""

# Start API server
cd server
npm run dev &
API_PID=$!

# Start Next.js
cd ../client  
npm run dev &
CLIENT_PID=$!

# Wait for both processes
wait $API_PID $CLIENT_PID
