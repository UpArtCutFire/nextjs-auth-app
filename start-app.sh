#!/bin/bash

# NextJS Auth App startup script
# This script starts the application using Docker Compose

APP_DIR="/opt/nextjs-auth-app"
LOGFILE="/var/log/nextjs-auth-app.log"

# Change to app directory
cd "$APP_DIR"

# Create log file if it doesn't exist
touch "$LOGFILE"

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOGFILE"
}

log "Starting NextJS Auth App..."

# Start PostgreSQL with Docker Compose
docker-compose up -d postgres

# Check if PostgreSQL started successfully
if [ $? -eq 0 ]; then
    log "PostgreSQL started successfully"
    
    # Wait for PostgreSQL to be ready
    sleep 15
    
    # Start NextJS app directly (build only if BUILD_ID doesn't exist)
    log "Starting NextJS application..."
    if [ ! -f ".next/BUILD_ID" ]; then
        log "BUILD_ID not found, building application..."
        yarn build
        if [ $? -ne 0 ]; then
            log "Error: Build failed"
            exit 1
        fi
    fi
    
    # For systemd Type=simple, we need to exec the final command
    log "Executing npm start..."
    exec npm start
else
    log "Error: Failed to start PostgreSQL"
    exit 1
fi