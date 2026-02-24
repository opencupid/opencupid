#!/bin/sh
set -eu

cat > /var/www/config.js <<EOF
window.__APP_CONFIG__ = {
  API_BASE_URL: "${API_BASE_URL:-/api}"
};
EOF

exec nginx -g "daemon off;"
