#!/bin/bash
# Post a single error event to Sentry when a systemd unit fails.
# Invoked by a companion unit via:
#   OnFailure=systemd-notify-sentry@<service>.service
# or directly:
#   ExecStart=/usr/local/bin/notify-sentry.sh <unit-name>

set -euo pipefail

UNIT="${1:-unknown.service}"
DSN="${SENTRY_DSN:-https://31c384058e2e404eb38413f6918f2d8a@log.gaians.net/1}"

KEY=$(echo "$DSN" | sed -nE 's#^https://([^@]+)@.*#\1#p')
HOST=$(echo "$DSN" | sed -nE 's#^https://[^@]+@([^/]+)/.*#\1#p')
PROJECT=$(echo "$DSN" | sed -nE 's#^https://[^@]+@[^/]+/(.*)#\1#p')

EVENT_ID=$(head -c 16 /dev/urandom | xxd -p)
TS_ISO=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
TS_UNIX=$(date +%s)

LOGS=$(journalctl -u "$UNIT" --since '1 hour ago' --no-pager --output=short -n 30 2>/dev/null \
       | tr '"' "'" | head -c 3000)

PAYLOAD=$(cat <<EOF
{
  "event_id": "$EVENT_ID",
  "timestamp": "$TS_ISO",
  "level": "error",
  "server_name": "gaians",
  "logger": "systemd/$UNIT",
  "platform": "other",
  "tags": {"component": "backup", "unit": "$UNIT"},
  "message": {"formatted": "systemd unit $UNIT failed"},
  "extra": {"journal_tail": "$LOGS"}
}
EOF
)

curl -sS --max-time 10 \
  -H "Content-Type: application/json" \
  -H "X-Sentry-Auth: Sentry sentry_version=7,sentry_client=systemd-notify/1.0,sentry_key=$KEY,sentry_timestamp=$TS_UNIX" \
  -d "$PAYLOAD" \
  "https://$HOST/api/$PROJECT/store/" >/dev/null || true

logger -t notify-sentry "sent event $EVENT_ID for failed unit $UNIT"
