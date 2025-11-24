#!/bin/bash

# NextJS Auth App shutdown script
# This script stops the application

APP_DIR="/opt/nextjs-auth-app"
LOGFILE="/var/log/nextjs-auth-app.log"

# Change to app directory
cd "$APP_DIR"

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOGFILE"
}

log "Stopping NextJS Auth App..."

# Stop the NextJS application
if [ -f /var/run/nextjs-auth-app.pid ]; then
    PID=$(cat /var/run/nextjs-auth-app.pid)
    if kill -0 $PID 2>/dev/null; then
        log "Stopping NextJS process (PID: $PID)"
        kill $PID
        sleep 5
        if kill -0 $PID 2>/dev/null; then
            log "Force stopping NextJS process"
            kill -9 $PID
        fi
    fi
    rm -f /var/run/nextjs-auth-app.pid
fi

# Stop PostgreSQL with Docker Compose
docker-compose down

if [ $? -eq 0 ]; then
    log "NextJS Auth App stopped successfully"
    exit 0
else
    log "Error: Failed to stop NextJS Auth App"
    exit 1
fi