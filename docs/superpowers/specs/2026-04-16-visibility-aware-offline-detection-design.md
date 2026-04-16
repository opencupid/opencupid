# Visibility-Aware Offline Detection

## Problem

On mobile devices, when the user switches tabs or backgrounds the app, the OS freezes the network stack. In-flight HTTP requests fail with network errors, and the WebSocket connection dies. The current offline detection interprets these failures as a server outage:

1. Failed requests hit the axios error interceptor, starting a 3s debounce timer.
2. The timer fires while the tab is hidden (JS isn't fully suspended), setting `isOffline = true` and showing `ApiErrorOverlay`.
3. When the user returns, the overlay is already visible. A retry succeeds moments later, hiding it — causing a flash of the error page.

Additionally:
- `safeApiCall` bypasses the 3s debounce entirely, setting `isOffline = true` immediately on any network error.
- The WebSocket's `onDisconnected` handler calls `fetchTicketUrl()`, which can itself fail and feed more network errors into the offline detection.

## Solution

Replace the implicit state (scattered booleans `isOffline`, `offlineDebounceId`, `retryTimeoutId`) with an explicit state machine that is visibility-aware. Network errors while the tab is hidden or resuming are expected and suppressed.

## Architecture: Three Modules

### 1. `src/lib/visibility.ts` — DOM-to-bus bridge

Listens for `document.visibilitychange` and emits bus events. No state, no logic.

```
visibilitychange -> hidden   ->  bus.emit('app:hidden')
visibilitychange -> visible  ->  bus.emit('app:visible')
```

Self-initializes on import. Bus event types added to `bus.ts`:

```ts
'app:hidden': void
'app:visible': void
```

### 2. `src/lib/api.ts` — State machine for offline detection

#### States

| State | Description |
|---|---|
| `ONLINE` | Normal operation, offline detection active |
| `DEBOUNCING` | Network error seen, 3s timer running before declaring offline |
| `OFFLINE` | API unreachable, retry mechanism polling every 10s, overlay visible |
| `SUSPENDED` | Tab is hidden, all offline detection suppressed, timers cancelled |
| `RESUMING` | Tab just became visible, 5s grace period, errors suppressed |

#### Transition table

| From | Event | To | Side effects |
|---|---|---|---|
| `ONLINE` | network error | `DEBOUNCING` | Start 3s debounce timer |
| `DEBOUNCING` | timer fires | `OFFLINE` | Emit `api:offline`, start retry mechanism |
| `DEBOUNCING` | success response | `ONLINE` | Cancel debounce timer |
| `DEBOUNCING` | `app:hidden` | `SUSPENDED` | Cancel debounce timer, set `wasOffline = false` |
| `OFFLINE` | success response | `ONLINE` | Emit `api:online`, resolve waiters, stop retries |
| `OFFLINE` | `app:hidden` | `SUSPENDED` | Stop retry mechanism, set `wasOffline = true` |
| `ONLINE` | `app:hidden` | `SUSPENDED` | Set `wasOffline = false` |
| `SUSPENDED` | network error | `SUSPENDED` | Swallowed (no-op) |
| `SUSPENDED` | success response | `SUSPENDED` | No-op (stay suspended) |
| `SUSPENDED` | `app:visible` | `RESUMING` | Fire health check, start 5s grace timer |
| `RESUMING` | success response | `ONLINE` | Emit `api:online` if `wasOffline`, cancel grace timer |
| `RESUMING` | network error | `RESUMING` | Swallowed (no-op) |
| `ONLINE` | success response | `ONLINE` | No-op |
| `RESUMING` | grace timer expires | `ONLINE` or `OFFLINE` | If `wasOffline` and no success response arrived during grace period: `OFFLINE` + emit `api:offline` + restart retries. Otherwise: `ONLINE` (next real error starts normal flow) |

#### `safeApiCall` changes

Currently sets `isOffline = true` immediately on any network error, bypassing the debounce. With the state machine:

- In `SUSPENDED` or `RESUMING`: wait for state resolution, then retry. Do not transition.
- In `ONLINE`: network error transitions to `DEBOUNCING` (same as interceptor path), then waits for resolution.
- In `OFFLINE`: already queued, waits for recovery as before.
- In `DEBOUNCING`: already in progress, waits for resolution.

#### Health check on resume

On entering `RESUMING`, fire `getVersionInfo({ timeout: 5000 })`. This proactively warms the connection. Its success/failure feeds into the normal interceptor path (success -> ONLINE, failure swallowed during grace period).

### 3. `src/lib/websocket.ts` — Visibility-driven lifecycle

Subscribes to bus events:

- **`app:hidden`**: Call `disconnectWebSocket()` with `isIntentionalClose = true`. Clean teardown, no `fetchTicketUrl`, no `onDisconnected` side effects.
- **`app:visible`**: Call `connectWebSocket()` only if user was previously connected. A new `wasConnected` flag tracks this — set `true` on successful WS connect, cleared on `auth:logout`.

The existing `api:online` listener remains as a fallback for non-visibility reconnection scenarios (actual server outage recovery while tab is active).

#### `onDisconnected` simplification

With proactive disconnect on `app:hidden`, the `fetchTicketUrl()` call in `onDisconnected` only needs to handle non-visibility disconnects (server-side close, network drop while tab is active). This is unchanged but now fires less frequently.

#### Single-use ticket context

WS tickets are single-use (backend uses Redis `getdel`). The proactive disconnect avoids the current race where `onDisconnected` fires `fetchTicketUrl()` concurrently with `autoReconnect`, which may try to use a stale consumed ticket.

## Bus events summary

| Event | Emitter | Consumers |
|---|---|---|
| `app:hidden` | `visibility.ts` | `api.ts`, `websocket.ts` |
| `app:visible` | `visibility.ts` | `api.ts`, `websocket.ts` |
| `api:offline` | `api.ts` | `AppNotifier.vue`, (unchanged) |
| `api:online` | `api.ts` | `AppNotifier.vue`, `websocket.ts`, `useUpdateChecker.ts` (unchanged) |

## Testing

### `visibility.spec.ts`
- Dispatching `visibilitychange` with `document.visibilityState = 'hidden'` emits `app:hidden`
- Dispatching `visibilitychange` with `document.visibilityState = 'visible'` emits `app:visible`

### `api.spec.ts`
- Network error in `ONLINE` transitions to `DEBOUNCING`
- Debounce timer firing transitions to `OFFLINE`, emits `api:offline`
- Success during `DEBOUNCING` cancels timer, stays `ONLINE`
- `app:hidden` from any state transitions to `SUSPENDED`, cancels timers
- Network error in `SUSPENDED` is swallowed
- `app:visible` transitions to `RESUMING`, fires health check
- Success in `RESUMING` transitions to `ONLINE`, emits `api:online` if was offline
- Network error in `RESUMING` is swallowed
- Grace timer expiry: goes to `OFFLINE` if `wasOffline`, else `ONLINE`
- `safeApiCall` in `SUSPENDED`/`RESUMING` waits for resolution instead of setting offline immediately

### `websocket.spec.ts`
- `app:hidden` triggers `disconnectWebSocket()` with `isIntentionalClose = true`
- `app:visible` triggers `connectWebSocket()` only if `wasConnected`
- `app:visible` does not trigger connect after `auth:logout`
- `api:online` still triggers reconnect (fallback path)

## Files changed

| File | Change |
|---|---|
| `src/lib/bus.ts` | Add `app:hidden`, `app:visible` event types |
| `src/lib/visibility.ts` | **New.** DOM visibilitychange listener, emits bus events |
| `src/lib/api.ts` | Replace booleans with state machine, subscribe to `app:hidden`/`app:visible` |
| `src/lib/websocket.ts` | Subscribe to `app:hidden`/`app:visible` for proactive disconnect/reconnect, add `wasConnected` flag |
| `src/lib/__tests__/visibility.spec.ts` | **New.** Tests for visibility module |
| `src/lib/__tests__/api.spec.ts` | Update tests for state machine transitions |
| `src/lib/__tests__/websocket.spec.ts` | Add tests for visibility-driven lifecycle |
