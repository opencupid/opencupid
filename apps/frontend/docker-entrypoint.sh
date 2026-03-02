#!/bin/sh
set -eu

# Defaults for OG meta tags (substituted into index.html)
OG_TITLE="${OG_TITLE:-OpenCupid}"
OG_DESCRIPTION="${OG_DESCRIPTION:-OpenCupid is an open-source dating platform.}"
OG_IMAGE="${OG_IMAGE:-}"
OG_URL="${OG_URL:-}"
OG_TYPE="${OG_TYPE:-website}"
SITE_NAME="${SITE_NAME:-OpenCupid}"

# Defaults for runtime app config
API_BASE_URL="${API_BASE_URL:-/api}"
WS_BASE_URL="${WS_BASE_URL:-/ws}"
MEDIA_URL_BASE="${MEDIA_URL_BASE:-/user-content}"
NODE_ENV="${NODE_ENV:-production}"
VAPID_PUBLIC_KEY="${VAPID_PUBLIC_KEY:-}"
SENTRY_DSN="${SENTRY_DSN:-}"
JITSI_DOMAIN="${JITSI_DOMAIN:-}"
VOICE_MESSAGE_MAX_DURATION="${VOICE_MESSAGE_MAX_DURATION:-120}"
MAPTILER_API_KEY="${MAPTILER_API_KEY:-}"

# 1. Substitute OG placeholders in index.html
envsubst '${OG_TITLE} ${OG_DESCRIPTION} ${OG_IMAGE} ${OG_URL} ${OG_TYPE} ${SITE_NAME}' \
  < /var/www/index.html > /var/www/index.html.tmp
mv /var/www/index.html.tmp /var/www/index.html

# 2. Generate config.js from committed template
envsubst '${API_BASE_URL} ${WS_BASE_URL} ${MEDIA_URL_BASE} ${NODE_ENV} ${VAPID_PUBLIC_KEY} ${SENTRY_DSN} ${SITE_NAME} ${JITSI_DOMAIN} ${VOICE_MESSAGE_MAX_DURATION} ${MAPTILER_API_KEY}' \
  < /var/www/config.template.js > /var/www/config.js

exec nginx -g "daemon off;"
