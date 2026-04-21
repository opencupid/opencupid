#!/bin/bash
# Daily backup of /srv to Hetzner Storage Box via restic.
# Runs from a recursive ZFS snapshot for consistency across child datasets.
#
# Requires on the host:
#   /root/.config/restic/password           (mode 600)
#   /root/.ssh/storagebox + config alias    (u446506-sub2 via port 23)
#   docker exec access to opencupid-db-1    (weekly pg_dumpall)

set -euo pipefail

TS="$(date -u +%Y%m%d-%H%M%S)"
SNAP="tank/srv@backup-${TS}"
SNAPDIR="/srv/.zfs/snapshot/backup-${TS}"

export RESTIC_REPOSITORY="sftp:storagebox:restic"
export RESTIC_PASSWORD_FILE="/root/.config/restic/password"
export RESTIC_CACHE_DIR="/var/cache/restic"

log() { printf "[%s] %s\n" "$(date -u +%FT%TZ)" "$*"; }

cleanup() {
  log "Destroying snapshot ${SNAP}"
  zfs destroy -r "${SNAP}" 2>/dev/null || log "WARN: snapshot destroy failed"
}
trap cleanup EXIT

log "Creating recursive ZFS snapshot ${SNAP}"
zfs snapshot -r "${SNAP}"

# Weekly (Sunday) pg_dumpall — written to live fs so next day's snapshot
# picks it up. Kept 5 weeks locally for fast rollback without Hetzner.
if [ "$(date +%u)" = "7" ]; then
  log "Weekly pg_dumpall"
  mkdir -p /srv/opencupid/db-dumps
  chmod 700 /srv/opencupid/db-dumps
  DUMP="/srv/opencupid/db-dumps/pgdumpall-$(date +%Y%m%d).sql.gz"
  docker exec -i opencupid-db-1 pg_dumpall -U appuser | gzip > "${DUMP}"
  find /srv/opencupid/db-dumps -name 'pgdumpall-*.sql.gz' -mtime +35 -delete
fi

log "Running restic backup from ${SNAPDIR}"
restic backup "${SNAPDIR}" \
  --host gaians \
  --tag daily \
  --exclude='**/.zfs' \
  --exclude='**/lost+found'

log "Applying retention policy"
restic forget --prune \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 6 \
  --keep-yearly 2 \
  --tag daily

log "Done"
