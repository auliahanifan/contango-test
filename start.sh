#!/bin/sh

# Run database migrations
echo "Running database migrations..."
npx drizzle-kit push

# Start the application
echo "Starting application..."
node --trace-deprecation server.js