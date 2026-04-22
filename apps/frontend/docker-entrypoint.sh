#!/bin/sh
set -eu

# 1. Substitute placeholders in index.html
envsubst < /var/www/index.html > /var/www/index.html.tmp
mv /var/www/index.html.tmp /var/www/index.html

# 2. Substitute placeholders in site.webmanifest
envsubst < /var/www/assets/site.webmanifest > /var/www/assets/site.webmanifest.tmp
mv /var/www/assets/site.webmanifest.tmp /var/www/assets/site.webmanifest

# 3. Generate config.js from committed template
envsubst < /var/www/config.template.js > /var/www/config.js

# 4. Generate security headers from template
if [ -n "${CSP_REPORT_URI:-}" ]; then
  export CSP_REPORT_DIRECTIVE="; report-uri ${CSP_REPORT_URI}"
else
  export CSP_REPORT_DIRECTIVE=""
fi
envsubst '${DOMAIN} ${JITSI_DOMAIN} ${CSP_ALLOWED_DOMAINS} ${CSP_REPORT_DIRECTIVE}' \
  < /etc/nginx/security-headers.conf.tmpl \
  > /etc/nginx/security-headers.conf

exec nginx -g "daemon off;"
