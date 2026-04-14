#!/bin/sh
set -eu

cat > /var/www/config.js <<EOF
window.__APP_CONFIG__ = {
  API_BASE_URL: "${API_BASE_URL:-/api}"
};
EOF

# Generate security headers from template
if [ -n "${CSP_REPORT_URI:-}" ]; then
  export CSP_REPORT_DIRECTIVE="; report-uri ${CSP_REPORT_URI}"
else
  export CSP_REPORT_DIRECTIVE=""
fi
envsubst '${CSP_REPORT_DIRECTIVE}' \
  < /etc/nginx/security-headers.conf.tmpl \
  > /etc/nginx/security-headers.conf

exec nginx -g "daemon off;"
