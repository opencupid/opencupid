#!/bin/sh
set -eu

# 1. Substitute OG placeholders in index.html
envsubst '${OG_TITLE} ${OG_DESCRIPTION} ${OG_IMAGE} ${OG_URL} ${OG_TYPE} ${SITE_NAME}' \
  < /var/www/index.html > /var/www/index.html.tmp
mv /var/www/index.html.tmp /var/www/index.html

# 2. Generate config.js from committed template
envsubst '${API_BASE_URL} ${WS_BASE_URL} ${MEDIA_URL_BASE} ${NODE_ENV} ${VAPID_PUBLIC_KEY} ${SENTRY_DSN} ${SITE_NAME} ${JITSI_DOMAIN} ${VOICE_MESSAGE_MAX_DURATION} ${MAPTILER_API_KEY}' \
  < /var/www/config.template.js > /var/www/config.js

exec nginx -g "daemon off;"
