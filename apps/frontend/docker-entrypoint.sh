#!/bin/sh
set -eu

# 1. Substitute OG placeholders in index.html
envsubst < /var/www/index.html > /var/www/index.html.tmp
mv /var/www/index.html.tmp /var/www/index.html

# 2. Generate config.js from committed template
envsubst < /var/www/config.template.js > /var/www/config.js

exec nginx -g "daemon off;"
