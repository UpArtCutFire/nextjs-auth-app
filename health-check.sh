#!/bin/bash

# NextJS Auth App health check script
# This script monitors the application health and sends alerts if needed

APP_URL="http://localhost:3000"
LOGFILE="/var/log/nextjs-auth-app-health.log"
PIDFILE="/var/run/nextjs-auth-app.pid"

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOGFILE"
}

# Function to check if application is responding
check_app_health() {
    if curl -s -f "$APP_URL" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to check if PostgreSQL is running
check_postgres_health() {
    if docker ps | grep -q "postgres.*healthy"; then
        return 0
    else
        return 1
    fi
}

# Function to restart the application
restart_app() {
    log "Restarting application..."
    systemctl restart nextjs-auth-app.service
    sleep 30
    
    if check_app_health; then
        log "Application restarted successfully"
        return 0
    else
        log "Failed to restart application"
        return 1
    fi
}

# Main health check
log "Starting health check..."

# Check PostgreSQL first
if ! check_postgres_health; then
    log "ERROR: PostgreSQL is not healthy"
    exit 1
fi

# Check application health
if check_app_health; then
    log "Application is healthy"
    exit 0
else
    log "WARNING: Application is not responding"
    
    # Try to restart once
    if restart_app; then
        log "Health check completed - application recovered"
        exit 0
    else
        log "CRITICAL: Application failed to recover"
        exit 1
    fi
fi