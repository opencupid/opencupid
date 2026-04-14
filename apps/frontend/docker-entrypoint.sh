#!/bin/sh
set -eu

# 1. Substitute OG placeholders in index.html
envsubst < /var/www/index.html > /var/www/index.html.tmp
mv /var/www/index.html.tmp /var/www/index.html

# 2. Generate config.js from committed template
envsubst < /var/www/config.template.js > /var/www/config.js

# 3. Generate security headers from template
if [ -n "${CSP_REPORT_URI:-}" ]; then
  export CSP_REPORT_DIRECTIVE="; report-uri ${CSP_REPORT_URI}"
else
  export CSP_REPORT_DIRECTIVE=""
fi
envsubst '${DOMAIN} ${CSP_ALLOWED_DOMAINS} ${CSP_REPORT_DIRECTIVE}' \
  < /etc/nginx/security-headers.conf.tmpl \
  > /etc/nginx/security-headers.conf

exec nginx -g "daemon off;"
