#!/bin/bash

# Start script for subscription management server
echo "[INFO] Starting Subscription Management Server..."

# Set working directory
cd /app

# Ensure data directory exists for persistent storage
if [ ! -d "/app/data" ]; then
    echo "[INFO] Creating data directory..."
    mkdir -p /app/data
fi

# Respect existing DATABASE_PATH if provided; otherwise set default path
if [ -z "$DATABASE_PATH" ]; then
    export DATABASE_PATH="/app/data/database.sqlite"
fi

# Database initialization and migration
if [ ! -f "$DATABASE_PATH" ]; then
    echo "[INFO] Initializing database..."
    node server/db/init.js || {
        echo "[ERROR] Database initialization failed!"
        exit 1
    }
    echo "[INFO] Database initialized successfully!"
else
    echo "[INFO] Running database migrations..."
    node server/db/migrate.js || {
        echo "[ERROR] Database migrations failed!"
        exit 1
    }
    echo "[INFO] Database migrations completed!"
fi

# Environment validation
echo "[INFO] API key auth removed. Using session-based authentication."

if [ -z "$TIANAPI_KEY" ]; then
    echo "[INFO] TIANAPI_KEY not set. Exchange rate updates disabled."
fi

# Start the application server
echo "[INFO] Starting server on port ${PORT:-3001}..."
exec node server/server.js
