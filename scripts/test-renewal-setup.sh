#!/bin/bash

# Test script to verify SSL certificate renewal setup
# This script tests that the renewal infrastructure is properly configured

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Testing SSL certificate renewal setup..."
echo "Project directory: $PROJECT_DIR"

cd "$PROJECT_DIR"

# Test 1: Check if docker-compose.production.yml is valid
echo "✓ Testing docker-compose configuration..."
if docker compose -f docker-compose.production.yml config --quiet; then
    echo "  ✓ docker-compose.production.yml is valid"
else
    echo "  ✗ docker-compose.production.yml has errors"
    exit 1
fi

# Test 2: Check if certbot-renew service is defined
echo "✓ Testing certbot-renew service definition..."
if docker compose -f docker-compose.production.yml config | grep -q "certbot-renew:"; then
    echo "  ✓ certbot-renew service is defined"
else
    echo "  ✗ certbot-renew service is missing"
    exit 1
fi

# Test 3: Check if renewal script exists and is executable
echo "✓ Testing renewal script..."
if [ -x "$PROJECT_DIR/scripts/renew-cert.sh" ]; then
    echo "  ✓ renew-cert.sh exists and is executable"
else
    echo "  ✗ renew-cert.sh is missing or not executable"
    exit 1
fi

# Test 4: Check script syntax
echo "✓ Testing script syntax..."
if bash -n "$PROJECT_DIR/scripts/renew-cert.sh"; then
    echo "  ✓ renew-cert.sh has valid syntax"
else
    echo "  ✗ renew-cert.sh has syntax errors"
    exit 1
fi

# Test 5: Check nginx acme-challenge configuration
echo "✓ Testing nginx acme-challenge configuration..."
if grep -q "location /.well-known/acme-challenge/" "$PROJECT_DIR/apps/ingress/nginx.conf.template"; then
    echo "  ✓ nginx is configured for acme-challenge"
else
    echo "  ✗ nginx acme-challenge configuration is missing"
    exit 1
fi

echo ""
echo "🎉 All tests passed! The SSL certificate renewal setup is ready."
echo ""
echo "To use the renewal system:"
echo "1. Ensure your production environment is running: docker compose -f docker-compose.production.yml up -d"
echo "2. Run manual renewal: ./scripts/renew-cert.sh"
echo "3. Add to crontab for daily renewal: 0 2 * * * /path/to/opencupid/scripts/renew-cert.sh >> /var/log/ssl-renewal.log 2>&1"