// config.template.js — runtime configuration injected by docker-entrypoint.sh.
// IMPORTANT: only expose values safe to be public in the browser.
// envsubst substitutes ${VAR} placeholders at container startup.
window.__APP_CONFIG__ = {
  API_BASE_URL: '${API_BASE_URL}',
  FRONTEND_URL: '${FRONTEND_URL}',
  WS_BASE_URL: '${WS_BASE_URL}',
  MEDIA_URL_BASE: '${MEDIA_URL_BASE}',
  NODE_ENV: '${NODE_ENV}',
  VAPID_PUBLIC_KEY: '${VAPID_PUBLIC_KEY}',
  SENTRY_DSN: '${SENTRY_DSN}',
  SITE_NAME: '${SITE_NAME}',
  JITSI_DOMAIN: '${JITSI_DOMAIN}',
  VOICE_MESSAGE_MAX_DURATION: '${VOICE_MESSAGE_MAX_DURATION}',
  MAP_TILE_URL: '${MAP_TILE_URL}',
  MAP_ATTRIBUTION: '${MAP_ATTRIBUTION}',
  GEOCODING_ALLOWED_COUNTRIES: '${GEOCODING_ALLOWED_COUNTRIES}',
}
