#!/bin/sh
set -eu

CONF=/etc/nginx

# Build the CSP report-uri directive (empty string if not configured)
if [ -n "${CSP_REPORT_URI:-}" ]; then
  export CSP_REPORT_DIRECTIVE="; report-uri ${CSP_REPORT_URI}"
else
  export CSP_REPORT_DIRECTIVE=""
fi

envsubst '${DOMAIN} ${ADMIN_DOMAIN} ${CSP_ALLOWED_DOMAINS} ${JWT_SECRET} ${CSP_REPORT_DIRECTIVE}' \
  < "$CONF/conf.d/https.conf.tmpl" \
  > "$CONF/conf.d/https.conf"

envsubst '${DOMAIN}' \
  < "$CONF/conf.d/security-headers.conf.tmpl" \
  > "$CONF/conf.d/security-headers.conf"

CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

if [ -f "$CERT" ] && [ -f "$KEY" ]; then
  ln -sf "$CONF/conf.d/https.conf" "$CONF/conf.d/active.conf"
else
  ln -sf "$CONF/conf.d/http-bootstrap.conf" "$CONF/conf.d/active.conf"
fi

exec nginx -g "daemon off;"
