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

# 5. Archive this release's hashed assets on the persistent volume mounted at
#    /srv/asset-archive. Each deploy replaces /var/www/assets wholesale, so a
#    tab opened before the deploy would 404 on lazy-loaded chunks of its own
#    build; nginx falls back to the archive for files the image lacks.
#    Overwriting (not cp -n) refreshes the mtime of every file this release
#    still uses, so pruning only removes files no release has used for 30 days.
mkdir -p /srv/asset-archive/assets
cp -r /var/www/assets/. /srv/asset-archive/assets/
find /srv/asset-archive/assets -type f -mtime +30 -delete

exec nginx -g "daemon off;"
