#!/bin/bash

# Monitor script for NextJS Auth App
# This script checks if the app is responding and restarts it if necessary

LOGFILE="/var/log/nextjs-auth-app-monitor.log"
MAX_RETRIES=3
RETRY_COUNT=0

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOGFILE"
}

# Function to check if app is responding
check_app() {
    if curl -s --max-time 10 http://localhost:3000/api/health >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to restart the service
restart_service() {
    log "Attempting to restart nextjs-auth-app service..."
    systemctl restart nextjs-auth-app
    sleep 30
}

# Main monitoring loop
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if check_app; then
        # App is responding, reset retry count and exit successfully
        if [ $RETRY_COUNT -gt 0 ]; then
            log "Application recovered successfully after $RETRY_COUNT retries"
        fi
        exit 0
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        log "Application not responding (attempt $RETRY_COUNT/$MAX_RETRIES)"
        
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            restart_service
        else
            log "CRITICAL: Application failed to recover after $MAX_RETRIES attempts"
            exit 1
        fi
    fi
done