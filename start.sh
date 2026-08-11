#!/bin/bash

# Start the backend API server
echo "Starting GlowSense API server..."
npx tsx server/index.ts &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 3

# Start the frontend dev server
echo "Starting frontend dev server..."
cd skin-sense-buddy-main && npm run dev &
FRONTEND_PID=$!

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

# Wait for both processes
wait
