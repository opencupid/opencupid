#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDFILE="$ROOT/.dev.pid"

# Ensure turbo is on PATH even when invoked outside of pnpm
export PATH="$ROOT/node_modules/.bin:$PATH"

# If a previous session is still running, stop it first
if [ -f "$PIDFILE" ]; then
  "$(dirname "$0")/dev-stop.sh" 2>/dev/null || true
fi

# Start turbo in a new process group (setsid) so we can kill the whole tree later
setsid turbo run dev &
PID=$!

# setsid makes the child its own process group leader, so PGID == child PID
echo "$PID" > "$PIDFILE"
echo "Dev server started (PGID $PID), PID file: $PIDFILE"

# Forward SIGINT/SIGTERM to the process group, then clean up
cleanup() {
  "$(dirname "$0")/dev-stop.sh" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# Wait so Ctrl+C in the terminal hits our trap
wait "$PID" 2>/dev/null || true
rm -f "$PIDFILE"
