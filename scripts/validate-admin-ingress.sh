#!/bin/bash
# Validation script for admin ingress configuration

set -e

echo "=== Admin Ingress Configuration Validation ==="
echo ""

# Check required files exist
echo "Checking required files..."
REQUIRED_FILES=(
    "apps/ingress-admin/Dockerfile"
    "apps/ingress-admin/nginx.conf.template"
    "apps/ingress-admin/index.html"
    "apps/admin/index.html"
    "scripts/generate-client-certs.sh"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file exists"
    else
        echo "✗ $file missing"
        exit 1
    fi
done

echo ""
echo "Checking docker-compose configuration..."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating temporary .env from .env.example..."
    cp .env.example .env.tmp
    ENV_FILE=".env.tmp"
else
    ENV_FILE=".env"
fi

# Validate docker-compose configuration
if docker compose -f docker-compose.production.yml --env-file "$ENV_FILE" config > /dev/null 2>&1; then
    echo "✓ docker-compose.production.yml is valid"
else
    echo "✗ docker-compose.production.yml has errors"
    docker compose -f docker-compose.production.yml --env-file "$ENV_FILE" config 2>&1 | tail -20
    [ -f ".env.tmp" ] && rm .env.tmp
    exit 1
fi

# Check if ingress-admin service is defined
if docker compose -f docker-compose.production.yml --env-file "$ENV_FILE" config 2>&1 | grep -q "ingress-admin:"; then
    echo "✓ ingress-admin service is defined"
else
    echo "✗ ingress-admin service not found"
    [ -f ".env.tmp" ] && rm .env.tmp
    exit 1
fi

# Check if certbot-init-admin service is defined
if docker compose -f docker-compose.production.yml --env-file "$ENV_FILE" config 2>&1 | grep -q "certbot-init-admin:"; then
    echo "✓ certbot-init-admin service is defined"
else
    echo "✗ certbot-init-admin service not found"
    [ -f ".env.tmp" ] && rm .env.tmp
    exit 1
fi

echo ""
echo "Checking environment variables in .env.example..."

# Check required env vars
REQUIRED_VARS=("ADMIN_DOMAIN" "CLIENT_CERT_DIR")
for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^$var=" .env.example; then
        echo "✓ $var is defined in .env.example"
    else
        echo "✗ $var missing from .env.example"
        exit 1
    fi
done

echo ""
echo "Testing Docker build..."

# Test build the ingress-admin image
if docker build -f apps/ingress-admin/Dockerfile apps/ingress-admin -t opencupid-ingress-admin:validation-test > /dev/null 2>&1; then
    echo "✓ ingress-admin Docker image builds successfully"
    # Clean up test image
    docker rmi opencupid-ingress-admin:validation-test > /dev/null 2>&1 || true
else
    echo "✗ ingress-admin Docker build failed"
    docker build -f apps/ingress-admin/Dockerfile apps/ingress-admin -t opencupid-ingress-admin:validation-test 2>&1 | tail -20
    [ -f ".env.tmp" ] && rm .env.tmp
    exit 1
fi

# Cleanup
[ -f ".env.tmp" ] && rm .env.tmp

echo ""
echo "=== All validation checks passed! ==="
echo ""
echo "Next steps:"
echo "1. Generate client certificates: ./scripts/generate-client-certs.sh /srv/client-certs"
echo "2. Obtain SSL certificate for admin domain"
echo "3. Start services: docker compose -f docker-compose.production.yml up -d ingress-admin"
echo "4. Import client.p12 to your browser"
echo "5. Visit https://admin.example.org"
echo ""
