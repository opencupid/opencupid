# Operations scripts

Host-side utility scripts for the production deployment on `gaians.net`.

## Inventory

| Script | Purpose |
|---|---|
| [backup-srv.sh](backup-srv.sh) | Daily restic backup of `/srv` to Hetzner Storage Box, from a recursive ZFS snapshot. Weekly pg_dumpall on Sundays. |
| [notify-sentry.sh](notify-sentry.sh) | POSTs a single error event to Sentry when a systemd unit fails. Used via `OnFailure=` on backup-related units. |

## Deployment

Scripts are **not** included in any Docker image; they run on the host. Deploy by pulling this repo on the host and symlinking into `/usr/local/bin`:

```
# On gaians.net, as root:
cd /opt/opencupid-scripts && git pull --ff-only
install -m 750 -o root -g root /opt/opencupid-scripts/scripts/backup-srv.sh /usr/local/bin/
install -m 750 -o root -g root /opt/opencupid-scripts/scripts/notify-sentry.sh /usr/local/bin/
```

(Adjust `/opt/opencupid-scripts` to wherever you clone the repo on the host.)

## Systemd units (expected alongside)

`/etc/systemd/system/restic-backup.service` and `.timer` invoke `backup-srv.sh`. The service's `OnFailure=restic-backup-notify.service` chain calls `notify-sentry.sh restic-backup.service`.

## Host prerequisites

- ZFS pool `tank` with dataset `tank/srv` containing child datasets.
- `restic` binary at `/usr/local/bin/restic`.
- `/root/.config/restic/password` (mode 600) — repository key.
- `/root/.ssh/config` alias `storagebox` → `u446506-sub2@u446506-sub2.your-storagebox.de:23` with `IdentityFile=/root/.ssh/storagebox`.
- Docker exec access to `opencupid-db-1` (for pg_dumpall).
