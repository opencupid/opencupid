#!/usr/bin/env bash
set -euo pipefail

PIDFILE="$(cd "$(dirname "$0")/.." && pwd)/.dev.pid"

if [ ! -f "$PIDFILE" ]; then
  echo "No .dev.pid file found — dev server not running."
  exit 0
fi

PGID=$(cat "$PIDFILE")

# Check if the process group still exists
if kill -0 -- "-$PGID" 2>/dev/null; then
  echo "Stopping dev server (PGID $PGID)..."
  kill -TERM -- "-$PGID" 2>/dev/null || true
  # Give processes a moment to exit gracefully
  sleep 2
  # Force-kill any survivors
  kill -9 -- "-$PGID" 2>/dev/null || true
  echo "Dev server stopped."
else
  echo "Process group $PGID not running (stale PID file)."
fi

rm -f "$PIDFILE"
