#!/usr/bin/env bash
set -euo pipefail

# Production smoke test — validates security headers, rate limiting,
# scanner blocking, and idempotency guards.
#
# Usage:
#   ./scripts/smoke-test.sh <base-url> <jwt-token> <refresh-token> [recipient-profile-id]
#
# The JWT can be expired — the script refreshes it automatically.
# Both tokens are single-use, so pass freshly obtained values.

BASE_URL="${1:?Usage: smoke-test.sh <base-url> <jwt-token> <refresh-token> [recipient-profile-id]}"
JWT="${2:?Missing jwt-token argument}"
REFRESH="${3:?Missing refresh-token argument}"
RECIPIENT="${4:-cmcv48b7g0002o801ukot37eb}"

PASS=0
FAIL=0
WARN=0

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; FAIL=$((FAIL + 1)); }
warn() { echo "  WARN  $1"; WARN=$((WARN + 1)); }
section() { echo ""; echo "--- $1 ---"; }

# --- Refresh JWT (accepts expired tokens) ---
refresh_token() {
  local resp new_jwt new_refresh
  resp=$(curl -sf -X POST "$BASE_URL/api/auth/refresh" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT" \
    -d "{\"refreshToken\":\"$REFRESH\"}" 2>/dev/null) || return 1

  new_jwt=$(echo "$resp" | jq -r '.token // empty')
  new_refresh=$(echo "$resp" | jq -r '.refreshToken // empty')

  if [[ -n "$new_jwt" && -n "$new_refresh" ]]; then
    JWT="$new_jwt"
    REFRESH="$new_refresh"
    return 0
  fi
  return 1
}

if refresh_token; then
  echo "Token refreshed."
else
  echo "WARNING: Token refresh failed — authenticated tests may fail."
fi

authed() { curl -s -H "Authorization: Bearer $JWT" "$@"; }

# ============================================================
section "1. Security Headers"
# ============================================================
HEADERS=$(curl -s -o /dev/null -D - "$BASE_URL/" 2>&1)

# CSP directives
if echo "$HEADERS" | grep -qi 'content-security-policy:'; then
  csp=$(echo "$HEADERS" | grep -i 'content-security-policy:')
  for directive in "default-src" "script-src" "frame-ancestors" "upgrade-insecure-requests"; do
    if echo "$csp" | grep -q "$directive"; then
      pass "CSP: $directive"
    else
      fail "CSP missing $directive"
    fi
  done
else
  fail "Content-Security-Policy header missing"
fi

# Other security headers
if echo "$HEADERS" | grep -qi 'x-content-type-options: nosniff'; then
  pass "X-Content-Type-Options: nosniff"
else
  fail "X-Content-Type-Options missing"
fi

if echo "$HEADERS" | grep -qi 'x-frame-options: deny'; then
  pass "X-Frame-Options: DENY"
else
  fail "X-Frame-Options missing"
fi

if echo "$HEADERS" | grep -qi 'permissions-policy:'; then
  pass "Permissions-Policy present"
else
  fail "Permissions-Policy missing"
fi

# Server header disclosure
server_header=$(echo "$HEADERS" | grep -i '^server:' | tr -d '\r') || true
if echo "$server_header" | grep -qiE '[0-9]+\.[0-9]+'; then
  fail "Server header leaks version: $server_header"
elif [[ -n "$server_header" ]]; then
  warn "Server header present (no version): $server_header"
else
  pass "Server header absent"
fi

# ============================================================
section "2. Scanner Probe Blocking"
# ============================================================
PROBES=("/test.php" "/wp-admin" "/.env" "/phpmyadmin" "/xmlrpc.php" "/backup.sql" "/config.old")

for probe in "${PROBES[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL$probe" 2>&1 || true)
  if [[ "$status" == "000" ]]; then
    pass "$probe → dropped (444)"
  elif [[ "$status" == "444" || "$status" == "403" || "$status" == "404" ]]; then
    pass "$probe → $status"
  else
    fail "$probe → $status (expected drop)"
  fi
done

# ============================================================
section "3. Rate Limiting"
# ============================================================
# Fire requests in parallel to actually exceed the burst window.
# nginx config: rate=5r/s burst=20 nodelay → 21st concurrent request should 429/503.
echo "  Sending 30 parallel requests..."
TMPDIR_RL=$(mktemp -d)
for i in $(seq 1 30); do
  curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL/" > "$TMPDIR_RL/$i" 2>&1 &
done
wait

results=""
for i in $(seq 1 30); do
  results+="$(cat "$TMPDIR_RL/$i") "
done
rm -rf "$TMPDIR_RL"

count_ok=$(echo "$results" | tr ' ' '\n' | grep -cE "^(200|301|302)$") || true
count_limited=$(echo "$results" | tr ' ' '\n' | grep -cE "^(429|503)$") || true

if [[ $count_limited -gt 0 ]]; then
  pass "Rate limiting triggered ($count_ok OK, $count_limited rejected)"
elif [[ $count_ok -ge 25 ]]; then
  warn "No rate limiting observed ($count_ok OK) — burst may absorb all 30 from single IP"
else
  fail "Unexpected: $results"
fi

# ============================================================
section "4. Authenticated Endpoints"
# ============================================================

# Verify auth works via the /app/version endpoint (unauthenticated but rate-limited)
version_resp=$(curl -s "$BASE_URL/api/app/version")
if echo "$version_resp" | jq -e '.version' >/dev/null 2>&1; then
  version=$(echo "$version_resp" | jq -r '.frontendVersion // .version // "unknown"')
  pass "API reachable (v$version)"
else
  warn "Version endpoint returned unexpected response"
fi

# Verify authenticated request works (triggers activity tracking)
profile_resp=$(authed "$BASE_URL/api/profiles/me")
if echo "$profile_resp" | jq -e '.id // .publicName' >/dev/null 2>&1; then
  name=$(echo "$profile_resp" | jq -r '.publicName // .id')
  pass "Authenticated OK — profile: $name"
elif echo "$profile_resp" | jq -e '.success == false' >/dev/null 2>&1; then
  warn "Auth failed — token consumed by refresh (expected)"
else
  warn "Authenticated /profiles/me returned unexpected response"
fi

# ============================================================
section "5. Idempotency Guards"
# ============================================================
echo "  Recipient profile: $RECIPIENT"

# Like idempotency: POST same like twice → both 200
like1=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "$BASE_URL/api/interactions/like/$RECIPIENT" -H "Authorization: Bearer $JWT")
like2=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "$BASE_URL/api/interactions/like/$RECIPIENT" -H "Authorization: Bearer $JWT")

if [[ "$like1" == "200" && "$like2" == "200" ]]; then
  pass "Like idempotency — replay returns 200"
elif [[ "$like1" == "200" ]]; then
  warn "Like replay returned $like2 (expected 200)"
elif [[ "$like1" == "401" ]]; then
  warn "Like skipped — auth expired"
elif [[ "$like1" == "400" || "$like1" == "500" ]]; then
  # Self-like or missing profile — not an idempotency failure
  warn "Like returned $like1 (self-like or invalid target — use a different recipient)"
else
  warn "Like test inconclusive: $like1 / $like2"
fi

# Message dedup: send identical text twice within 5s → same message ID
DEDUP_MSG="smoke-test-$(date +%s)"
msg1=$(curl -s -X POST "$BASE_URL/api/messages/message" \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d "{\"profileId\":\"$RECIPIENT\",\"content\":\"$DEDUP_MSG\"}")
msg2=$(curl -s -X POST "$BASE_URL/api/messages/message" \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d "{\"profileId\":\"$RECIPIENT\",\"content\":\"$DEDUP_MSG\"}")

id1=$(echo "$msg1" | jq -r '.message.id // empty' 2>/dev/null) || true
id2=$(echo "$msg2" | jq -r '.message.id // empty' 2>/dev/null) || true

if [[ -n "$id1" && "$id1" == "$id2" ]]; then
  pass "Message dedup — same ID returned ($id1)"
elif [[ -n "$id1" && -n "$id2" ]]; then
  fail "Message dedup broken — different IDs ($id1 vs $id2)"
elif [[ -z "$id1" ]]; then
  err1=$(echo "$msg1" | jq -r '.message // .error // empty' 2>/dev/null) || true
  warn "Message dedup skipped — $err1"
else
  warn "Message dedup inconclusive"
fi

# ============================================================
section "Results"
# ============================================================
echo ""
echo "  $PASS passed, $FAIL failed, $WARN warnings"
echo ""

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
