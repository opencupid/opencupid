#!/bin/sh
set -eu

cat > /var/www/config.js <<EOF
window.__APP_CONFIG__ = {
  API_BASE_URL: "${API_BASE_URL:-/api}",
  WS_BASE_URL: "${WS_BASE_URL:-/ws}",
  MEDIA_URL_BASE: "${MEDIA_URL_BASE:-/user-content}",
  NODE_ENV: "${NODE_ENV:-production}",
  VAPID_PUBLIC_KEY: "${VAPID_PUBLIC_KEY:-}",
  SENTRY_DSN: "${SENTRY_DSN:-}",
  SITE_NAME: "${SITE_NAME:-OpenCupid}",
  JITSI_DOMAIN: "${JITSI_DOMAIN:-}",
  VOICE_MESSAGE_MAX_DURATION: ${VOICE_MESSAGE_MAX_DURATION:-120},
  MAPTILER_API_KEY: "${MAPTILER_API_KEY:-}"
};
EOF

exec nginx -g "daemon off;"
