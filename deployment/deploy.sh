#!/usr/bin/env bash
# deploy.sh — run locally after `terraform apply` to start the app on staging.
#
# Prerequisites:
#   - terraform apply must have completed successfully
#   - GHCR_TOKEN env var must be set (GitHub PAT with read:packages scope)
#   - .env.staging must exist in this directory (copy from .env.staging.example and fill in)
#

set -euo pipefail

# SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_DIR=$(dirname -- "$0")
TF_DIR="$SCRIPT_DIR/terraform"

# ── Validate prerequisites ────────────────────────────────────────────────────

# : "${GHCR_TOKEN:?GHCR_TOKEN is required (GitHub PAT with read:packages scope)}"
# : "${GHCR_USER:?GHCR_USER is required (your GitHub username)}"

ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/../.env.staging}"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.example to .env.staging and fill it in."
  exit 1
fi

# ── Read server IP from terraform output ─────────────────────────────────────

SERVER_IP=$(terraform -chdir="$TF_DIR" output -raw server_ip)
SSH_KEY_FILE=$(terraform -chdir="$TF_DIR" output -raw ssh_private_key_file)
SSH_USER="user"
SSH_OPTS="-q -i $SSH_KEY_FILE -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5"
SSH="ssh $SSH_OPTS $SSH_USER@$SERVER_IP"
SCP="scp $SSH_OPTS"

echo "Server: $SERVER_IP"

# # ── Wait for cloud-init to finish ─────────────────────────────────────────────
# # cloud-init runs on first boot and takes ~3-5 minutes.
# # `cloud-init status --wait` blocks until complete (exit 0) or failed (exit 1).

echo "Waiting for cloud-init (this takes ~3-5 minutes on first boot)..."
$SSH "sudo cloud-init status --wait" 

# ── Clone or update repo ──────────────────────────────────────────────────────

$SSH '
  if [ ! -d ~/opencupid ]; then
    git clone https://github.com/opencupid/opencupid.git ~/opencupid
  else
    git -C ~/opencupid fetch --tags
  fi
'

# ── Upload .env ───────────────────────────────────────────────────────────────

$SCP "$ENV_FILE" "$SSH_USER@$SERVER_IP:~/opencupid/.env"
echo "Uploaded .env"

# ── Upload admin CA cert (if present) ────────────────────────────────────────

if [ -f "secrets/ca.crt" ]; then
  $SCP "secrets/ca.crt" "$SSH_USER@$SERVER_IP:/tmp/ca.crt"
  $SSH "sudo mv /tmp/ca.crt /srv/admin-ca/ca.crt && sudo chown user:user /srv/admin-ca/ca.crt"
  echo "Uploaded admin CA cert"
fi

# ── Pull images ───────────────────────────────────────────────────────────────
$SSH "cd ~/opencupid && docker compose  pull --quiet"

# ── Start services ────────────────────────────────────────────────────────
$SSH "cd ~/opencupid && docker compose  up -d"

# ── Obtain TLS cert from LetsEncrypt ───────────────────────────────────────────────────────────────
$SSH "cd ~/opencupid && source .env && docker compose run --rm --service-ports certbot certonly \
  --webroot -w /var/www/html \
  --email \"\$EMAIL\" \
  --agree-tos \
  --no-eff-email \
  -d \"\$DOMAIN\" \
  -d \"\$ADMIN_DOMAIN\" \
  -d \"\$JITSI_DOMAIN\""

# ── Restart ingress  to apply cert ───────────────────────────────────────────────────────────────
$SSH "cd ~/opencupid && docker compose restart ingress"

# ── Run database migrations ───────────────────────────────────────────────────

echo "Running database migrations..."
$SSH "cd ~/opencupid && docker compose exec backend npx prisma migrate deploy"

echo "Running database seeds..."
$SSH "cd ~/opencupid && docker compose exec backend npx prisma db seed"


# ── Done ──────────────────────────────────────────────────────────────────────
STAGING_URL=$(terraform -chdir="$TF_DIR" output -raw staging_url)
echo ""
echo "✓ Deployment completed successfully"
echo "  URL: $STAGING_URL"
echo "  SSH: ssh $SSH_USER@$SERVER_IP"
