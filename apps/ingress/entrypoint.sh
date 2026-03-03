#!/bin/sh
set -eu

CONF=/usr/local/openresty/nginx/conf

envsubst '${DOMAIN} ${ADMIN_DOMAIN} ${CSP_ALLOWED_DOMAINS}' \
  < "$CONF/conf.d/https.conf.tmpl" \
  > "$CONF/conf.d/https.conf"

CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

if [ -f "$CERT" ] && [ -f "$KEY" ]; then
  ln -sf "$CONF/conf.d/https.conf" "$CONF/conf.d/active.conf"
else
  ln -sf "$CONF/conf.d/http-bootstrap.conf" "$CONF/conf.d/active.conf"
fi

exec openresty -g "daemon off;"
