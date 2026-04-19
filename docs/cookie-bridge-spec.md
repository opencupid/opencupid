# Cookie Bridge Sidecar — Domain Migration Spec

## Context

OpenCupid is migrating from one top-level domain to another (e.g. `old.example.org` → `new.example.org`). These are different TLDs — no shared parent domain exists.

The app uses two cookies for auth, both set **without** an explicit `domain` attribute (host-only):

| Cookie | Name | HttpOnly | SameSite | Secure | MaxAge | Purpose |
|--------|------|----------|----------|--------|--------|---------|
| Session | `__session` | `false` | `strict` | `true` (prod) | 30 days | JWT readable by JS — frontend parses userId/profileId |
| Refresh | `__refresh` | `true` | `strict` | `true` (prod) | 90 days | Opaque UUID — silent token refresh on 401 |

Cookie config is defined in `packages/shared/session.ts`. Backend sets them in `apps/backend/src/api/routes/auth.route.ts` (`setSessionCookie`, `setRefreshCookie`). Frontend reads `__session` via `universal-cookie` in `apps/frontend/src/features/auth/stores/authStore.ts`.

Sessions are backed by Redis (keyed by the JWT string itself). Refresh tokens are also in Redis.

### Why cookies don't transfer

Cookies scoped to `old.example.org` are invisible to `new.example.org`. `SameSite: strict` means they aren't sent even on cross-site navigations/redirects. Without intervention, all users lose their sessions on domain change.

### Decision: no `domain=` attribute

We evaluated adding `domain=.newdomain.org` to cookies for subdomain flexibility. Rejected because:

- **Jitsi exposure**: `meet.newdomain.org` runs third-party JS that could read the non-httpOnly `__session` JWT. Real credential leak vector.
- **Unnecessary scope**: `/user-content` (media) stays path-routed on the main domain. If we ever move it to a subdomain, signed URLs are the correct approach — not shared cookies.
- Easy to add `domain=` later; hard to remove (users lose sessions again).

Cookies remain host-only on the new domain.

## Architecture

A stateless sidecar service bridges cookies from old domain to new domain using encrypted URL tokens.

```
User visits old.example.org/inbox
         │
         ▼
┌─────────────────────────────────┐
│ Traefik: Host(OLD_DOMAIN)       │
│ catch-all → sidecar /export/*   │
└────────┬────────────────────────┘
         │
    Reads __session + __refresh cookies
    (browser sends them — old domain matches)
         │
    Cookies present?
    ├── no  → 302 → new.example.org/inbox (nothing to bridge)
    └── yes → Encrypt {cookies, path, expiry} with AES-256-GCM
              302 → new.example.org/_bridge?t=<encrypted-token>
                            │
                            ▼
              ┌─────────────────────────────────┐
              │ Traefik: Host(DOMAIN) &&        │
              │ Path(/_bridge) → sidecar /import│
              └────────┬────────────────────────┘
                       │
                  Decrypt token, check expiry
                  Set-Cookie: __session (same flags as backend)
                  Set-Cookie: __refresh (same flags as backend)
                  302 → new.example.org/inbox (clean URL)
                       │
                       ▼
                  Normal app — cookies now on new domain
```

### Why stateless (no Redis)

The token carries the encrypted cookie values directly. AES-256-GCM provides confidentiality (cookie values not visible in URL) and integrity (tamper detection). No shared state needed — the sidecar can run anywhere with just a secret key.

Trade-off: tokens are replayable within the 60-second TTL window (unlike Redis delete-after-read). Acceptable because an attacker who can intercept the HTTPS redirect URL already has a position to steal cookies directly.

## Sidecar Implementation

Standalone repo, not part of the OpenCupid monorepo. Single-file Fastify service.

### Environment Variables

| Var | Example | Description |
|-----|---------|-------------|
| `NEW_DOMAIN` | `new.example.org` | Target domain for redirects |
| `BRIDGE_SECRET` | `(64-char hex string)` | 32-byte AES-256 key, hex-encoded |
| `NODE_ENV` | `production` | Controls `Secure` flag on cookies |

Generate `BRIDGE_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Dependencies

```json
{
  "dependencies": {
    "fastify": "^5",
    "@fastify/cookie": "^11"
  }
}
```

### Source

```js
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const app = Fastify()
app.register(cookie)

const NEW_ORIGIN = `https://${process.env.NEW_DOMAIN}`
const KEY = Buffer.from(process.env.BRIDGE_SECRET, 'hex') // 32 bytes
const TTL = 60 // seconds
const SECURE = process.env.NODE_ENV === 'production'

function encrypt(obj) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', KEY, iv)
  const ct = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, ct, tag]).toString('base64url')
}

function decrypt(token) {
  const buf = Buffer.from(token, 'base64url')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(buf.length - 16)
  const ct = buf.subarray(12, buf.length - 16)
  const decipher = createDecipheriv('aes-256-gcm', KEY, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(ct), decipher.final()])
  return JSON.parse(plain.toString('utf8'))
}

// ── Export: old domain ──
// Traefik AddPrefix turns /inbox → /export/inbox before forwarding here.
app.get('/export/*', async (req, reply) => {
  const path = req.params['*'] || '/'
  const s = req.cookies.__session
  const r = req.cookies.__refresh

  if (!s && !r) return reply.redirect(`${NEW_ORIGIN}/${path}`)

  const token = encrypt({ s, r, p: `/${path}`, exp: Date.now() + TTL * 1000 })
  return reply.redirect(`${NEW_ORIGIN}/_bridge?t=${token}`)
})

// ── Import: new domain ──
// Traefik ReplacePath turns /_bridge → /import before forwarding here.
app.get('/import', async (req, reply) => {
  const { t } = req.query
  let data
  try {
    data = decrypt(t)
  } catch {
    return reply.redirect(NEW_ORIGIN)
  }

  if (Date.now() > data.exp) return reply.redirect(NEW_ORIGIN)

  if (data.s) {
    reply.setCookie('__session', data.s, {
      path: '/', sameSite: 'strict', secure: SECURE,
      httpOnly: false, maxAge: 60 * 60 * 24 * 30,
    })
  }
  if (data.r) {
    reply.setCookie('__refresh', data.r, {
      path: '/', sameSite: 'strict', secure: SECURE,
      httpOnly: true, maxAge: 60 * 60 * 24 * 90,
    })
  }

  return reply.redirect(`${NEW_ORIGIN}${data.p || '/'}`)
})

app.listen({ port: 3099, host: '0.0.0.0' })
```

### Dockerfile

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY index.js .
EXPOSE 3099
CMD ["node", "index.js"]
```

## Traefik Configuration

Add to `docker-compose.production.yml`:

```yaml
cookie-bridge:
  image: ghcr.io/yourorg/cookie-bridge:latest
  restart: always
  environment:
    - NEW_DOMAIN=${DOMAIN}
    - BRIDGE_SECRET=${BRIDGE_SECRET}
    - NODE_ENV=production
  labels:
    traefik.enable: "true"

    # ── Old domain: catch-all → sidecar /export/* ──
    # AddPrefix turns any path (e.g. /inbox) into /export/inbox
    # so the sidecar's route handler receives the original path.
    traefik.http.routers.bridge-export.rule: "Host(`${OLD_DOMAIN}`)"
    traefik.http.routers.bridge-export.entrypoints: websecure
    traefik.http.routers.bridge-export.tls.certResolver: letsencrypt
    traefik.http.routers.bridge-export.priority: "1"
    traefik.http.routers.bridge-export.middlewares: bridge-export-prefix
    traefik.http.middlewares.bridge-export-prefix.addprefix.prefix: "/export"
    traefik.http.services.cookie-bridge.loadbalancer.server.port: "3099"

    # ── New domain: /_bridge → sidecar /import ──
    # High priority so it matches before the frontend catch-all (priority 1).
    # ReplacePath rewrites /_bridge to /import for the sidecar handler.
    traefik.http.routers.bridge-import.rule: "Host(`${DOMAIN}`) && Path(`/_bridge`)"
    traefik.http.routers.bridge-import.entrypoints: websecure
    traefik.http.routers.bridge-import.priority: "100"
    traefik.http.routers.bridge-import.middlewares: bridge-import-rewrite
    traefik.http.middlewares.bridge-import-rewrite.replacepath.path: "/import"
```

### New env vars for `.env`

```env
# Domain migration (temporary — remove after transition period)
OLD_DOMAIN=old.example.org
BRIDGE_SECRET=<output of: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

`DOMAIN` and `FRONTEND_URL` should already point to the new domain.

## OpenCupid Backend Changes

**None required.** The backend doesn't need to know about the old domain. Cookies are set without an explicit `domain` attribute, so they naturally scope to whatever domain the response is served from (which is the new domain after migration).

The only env changes in the main app:
- `DOMAIN=new.example.org` (was `old.example.org`)
- `FRONTEND_URL=https://new.example.org` (was `https://old.example.org`)
- `FRONTEND_URLS=` — remove old domain if listed (CORS no longer needed for it since the bridge handles redirects, not API calls)

## Deployment Sequence

1. **Update DNS**: Point both `old.example.org` and `new.example.org` A/AAAA records to the server.
2. **Update `.env`**: Set `DOMAIN=new.example.org`, `FRONTEND_URL=https://new.example.org`, add `OLD_DOMAIN` and `BRIDGE_SECRET`.
3. **Deploy**: `docker compose up -d` — Traefik picks up both domain routers and auto-provisions TLS via Let's Encrypt for both.
4. **Transition period**: ~90 days (matches `__refresh` max age). Any user visiting the old domain gets silently bridged. Users who never visit during this window have expired cookies anyway.
5. **Teardown**: Remove `cookie-bridge` service, `OLD_DOMAIN` env var, `BRIDGE_SECRET`, old DNS records.

## Security Properties

- **Confidentiality**: Cookie values are AES-256-GCM encrypted — not visible in the URL or server logs (the token is opaque base64url).
- **Integrity**: GCM auth tag prevents tampering with the token.
- **Expiry**: 60-second TTL embedded in the encrypted payload. Stale tokens are rejected.
- **HTTPS only**: Both domains behind Traefik TLS. Tokens only travel over encrypted connections.
- **No replay window concern**: An attacker who can intercept the redirect URL within the 60s window already has a MITM position that lets them steal cookies directly. The token doesn't expand the attack surface.
- **No state**: Sidecar is stateless — can crash, restart, scale horizontally without coordination.
