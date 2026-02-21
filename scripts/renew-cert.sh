#!/bin/bash

# SSL Certificate Renewal Script for OpenCupid
# This script should be run daily via cron job
#
# Docker Compose picks up the correct file via COMPOSE_FILE in .env
# (set to docker-compose.production.yml on the prod server).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Starting SSL certificate renewal process..."
echo "Project directory: $PROJECT_DIR"

cd "$PROJECT_DIR"

# Run certbot renewal using the certbot-renew service
echo "Running certbot renewal..."
if docker compose run --rm certbot-renew; then
    echo "Certificate renewal completed successfully"

    # Reload nginx configuration in ingress service
    echo "Reloading nginx configuration..."
    if docker compose exec ingress nginx -s reload; then
        echo "Nginx configuration reloaded successfully"
    else
        echo "Warning: Failed to reload nginx configuration"
        exit 1
    fi
else
    echo "Certificate renewal failed"
    exit 1
fi

echo "SSL certificate renewal process completed successfully"
