#!/bin/sh
set -eu

# The manifest's short_name (home-screen label) defaults to the full site name.
export SITE_SHORT_NAME="${SITE_SHORT_NAME:-${SITE_NAME:-}}"

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

# 5. Publish this build's content-hashed files into /var/www/assets/build.
#    The image keeps them in /opt/opencupid/build; /var/www/assets/build is a
#    persistent volume (see docker-compose.production.yml) that accumulates the
#    files of the last KEEP_RELEASES builds, so a tab opened before a deploy can
#    still lazy-load its own build's chunks. Filenames are content hashes, so an
#    existing file is never rewritten (--update=none), and every file is in
#    place before nginx starts serving the index.html that references it.
#    Without the volume this is a plain per-container directory and still works.
BUILD_SRC=/opt/opencupid/build
BUILD_DIR=/var/www/assets/build
RELEASES_DIR="$BUILD_DIR/.releases"
KEEP_RELEASES=10

mkdir -p "$RELEASES_DIR"
cd "$BUILD_SRC"
release_id=$(ls | sha256sum | cut -c1-16)
ls | grep -v '\.map$' > "$RELEASES_DIR/.$release_id.tmp"
xargs cp --update=none -t "$BUILD_DIR" < "$RELEASES_DIR/.$release_id.tmp"
# Registering (or re-registering, on rollback) makes this the newest release.
mv "$RELEASES_DIR/.$release_id.tmp" "$RELEASES_DIR/$release_id"

# Keep the newest KEEP_RELEASES release lists; delete files no kept list names.
cd "$RELEASES_DIR"
ls -t | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -f --
keep=$(mktemp)
cat -- * | sort -u > "$keep"
cd "$BUILD_DIR"
ls | sort | comm -23 - "$keep" | xargs -r rm -f --
rm -f "$keep"
cd /

exec nginx -g "daemon off;"
