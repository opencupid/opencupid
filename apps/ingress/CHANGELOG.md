# @opencupid/ingress

## 0.27.0

## 0.26.0

## 0.25.0

## 0.24.0

## 0.23.1

## 0.23.0

## 0.17.3

### Patch Changes

- e19b607: Consolidate CSP allowed domains into single config option

## 0.17.2

### Patch Changes

- 3624003: Fix frontend not recovering from ApiError after docker compose pull + up (#880)

  Root cause: nginx cached the old container IP at startup; after container hot-swap the IP changed and nginx returned 502 indefinitely. Added Docker's embedded DNS resolver (`127.0.0.11 valid=10s`) and switched all `proxy_pass` directives to use variables so nginx re-resolves service hostnames after container replacement.

  Secondary fix: WebSocket now reconnects automatically when `api:online` fires (previously autoReconnect gave up after 3 retries and was never re-attempted).

## 0.17.1

### Patch Changes

- c6a448e: Improve robustness of ingress certbot setup (#911)
