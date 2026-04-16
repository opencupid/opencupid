# Visibility-Aware Offline Detection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace implicit boolean offline-detection flags with a visibility-aware state machine so that backgrounding the app on mobile no longer flashes the error overlay.

**Architecture:** Three modules coordinate via the existing event bus. `visibility.ts` bridges the DOM `visibilitychange` event to bus events. `api.ts` replaces its scattered booleans with a 5-state machine (`ONLINE`, `DEBOUNCING`, `OFFLINE`, `SUSPENDED`, `RESUMING`). `websocket.ts` proactively disconnects/reconnects on visibility transitions.

**Tech Stack:** TypeScript, Vitest, Axios interceptors, VueUse `useWebSocket`, mitt event bus

**Spec:** `docs/superpowers/specs/2026-04-16-visibility-aware-offline-detection-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/bus.ts` | Modify | Add `app:hidden` and `app:visible` event types |
| `src/lib/visibility.ts` | Create | DOM `visibilitychange` → bus bridge |
| `src/lib/__tests__/visibility.spec.ts` | Create | Tests for visibility module |
| `src/lib/api.ts` | Modify | Replace booleans with state machine, subscribe to visibility events |
| `src/lib/__tests__/api.spec.ts` | Modify | Update/add tests for state machine transitions |
| `src/lib/websocket.ts` | Modify | Subscribe to visibility events for proactive disconnect/reconnect |
| `src/lib/__tests__/websocket.spec.ts` | Modify | Add tests for visibility-driven lifecycle |

---

## Task 1: Add bus event types and create `visibility.ts`

**Files:**
- Modify: `src/lib/bus.ts:5-16`
- Create: `src/lib/visibility.ts`
- Create: `src/lib/__tests__/visibility.spec.ts`

- [ ] **Step 1: Write failing tests for visibility module**

Create `apps/frontend/src/lib/__tests__/visibility.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'

const mockEmit = vi.fn()
vi.mock('@/lib/bus', () => ({
  bus: { emit: mockEmit },
}))

describe('visibility', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('emits app:hidden when document becomes hidden', async () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    })

    await import('../visibility')
    document.dispatchEvent(new Event('visibilitychange'))

    expect(mockEmit).toHaveBeenCalledWith('app:hidden')
    expect(mockEmit).not.toHaveBeenCalledWith('app:visible')
  })

  it('emits app:visible when document becomes visible', async () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    })

    await import('../visibility')
    document.dispatchEvent(new Event('visibilitychange'))

    expect(mockEmit).toHaveBeenCalledWith('app:visible')
    expect(mockEmit).not.toHaveBeenCalledWith('app:hidden')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter frontend exec vitest run src/lib/__tests__/visibility.spec.ts`
Expected: FAIL — module `../visibility` does not exist.

- [ ] **Step 3: Add event types to bus.ts**

In `apps/frontend/src/lib/bus.ts`, add two new events to the `AppEvents` type:

```ts
type AppEvents = {
  'auth:login': { token: string }
  'auth:logout': void
  'auth:logged-out': void
  'auth:token-refreshed': { token: string }
  'notification:new_message': MessageDTO
  'language:changed': { language: string }
  'api:offline': void
  'api:online': void
  'app:hidden': void
  'app:visible': void
  'profile:dating-prefs-updated': void
  'profile:blocked': { profileId: string }
}
```

- [ ] **Step 4: Create visibility.ts**

Create `apps/frontend/src/lib/visibility.ts`:

```ts
import { bus } from './bus'

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    bus.emit('app:hidden')
  } else {
    bus.emit('app:visible')
  }
})
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run src/lib/__tests__/visibility.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/lib/bus.ts apps/frontend/src/lib/visibility.ts apps/frontend/src/lib/__tests__/visibility.spec.ts
git commit -m "feat: add visibility.ts DOM-to-bus bridge and app:hidden/app:visible events"
```

---

## Task 2: Replace api.ts booleans with state machine

**Files:**
- Modify: `src/lib/api.ts:1-186`
- Modify: `src/lib/__tests__/api.spec.ts`

This is the largest task. The state machine replaces lines 30-56 (state variables and `startRetryMechanism`) and lines 79-161 (interceptors) and lines 164-184 (`safeApiCall`).

- [ ] **Step 1: Write failing tests for new state machine transitions**

Append these test cases to `apps/frontend/src/lib/__tests__/api.spec.ts`, inside the existing `describe('api error handling', ...)` block, after the last `it(...)`:

```ts
  it('suppresses offline detection when tab is hidden (SUSPENDED state)', async () => {
    const mockAdapter = vi.fn().mockRejectedValue({
      code: 'ERR_NETWORK',
      config: { headers: new AxiosHeaders() },
      isAxiosError: true,
    })
    api.defaults.adapter = mockAdapter

    // Emit app:hidden to enter SUSPENDED state
    const { bus } = await import('../bus')
    bus.emit('app:hidden')

    try {
      await api.get('/test')
    } catch {
      // expected
    }

    vi.advanceTimersByTime(5000)

    // Should NOT have emitted api:offline while suspended
    expect(mockEmit).not.toHaveBeenCalledWith('api:offline')
  })

  it('cancels pending debounce when tab goes hidden', async () => {
    const mockAdapter = vi.fn().mockRejectedValue({
      code: 'ERR_NETWORK',
      config: { headers: new AxiosHeaders() },
      isAxiosError: true,
    })
    api.defaults.adapter = mockAdapter

    // Trigger network error — starts debounce
    try {
      await api.get('/test')
    } catch {
      // expected
    }

    // Tab goes hidden before debounce fires
    const { bus } = await import('../bus')
    bus.emit('app:hidden')

    vi.advanceTimersByTime(5000)

    expect(mockEmit).not.toHaveBeenCalledWith('api:offline')
  })

  it('enters RESUMING state on app:visible and suppresses errors during grace period', async () => {
    const { bus } = await import('../bus')

    // Go hidden then visible
    bus.emit('app:hidden')
    bus.emit('app:visible')

    // Network error during grace period should be suppressed
    const mockAdapter = vi.fn().mockRejectedValue({
      code: 'ERR_NETWORK',
      config: { headers: new AxiosHeaders() },
      isAxiosError: true,
    })
    api.defaults.adapter = mockAdapter

    try {
      await api.get('/test')
    } catch {
      // expected
    }

    vi.advanceTimersByTime(3000)
    expect(mockEmit).not.toHaveBeenCalledWith('api:offline')
  })

  it('transitions from RESUMING to ONLINE on success response', async () => {
    const { bus } = await import('../bus')

    // Simulate was offline before suspend
    const failAdapter = vi.fn().mockRejectedValue({
      code: 'ERR_NETWORK',
      config: { headers: new AxiosHeaders() },
      isAxiosError: true,
    })
    api.defaults.adapter = failAdapter

    try { await api.get('/test') } catch { /* expected */ }
    vi.advanceTimersByTime(3000) // fire debounce → OFFLINE

    expect(mockEmit).toHaveBeenCalledWith('api:offline')
    mockEmit.mockClear()

    // Suspend and resume
    bus.emit('app:hidden')
    bus.emit('app:visible')

    // Success response during RESUMING
    const successAdapter = vi.fn().mockResolvedValue({
      status: 200,
      data: {},
      headers: {},
      config: {},
      statusText: 'OK',
    })
    api.defaults.adapter = successAdapter

    await api.get('/test')

    expect(mockEmit).toHaveBeenCalledWith('api:online')
  })

  it('returns to OFFLINE if was offline and grace period expires without success', async () => {
    const { bus } = await import('../bus')

    // Get into OFFLINE state
    const failAdapter = vi.fn().mockRejectedValue({
      code: 'ERR_NETWORK',
      config: { headers: new AxiosHeaders() },
      isAxiosError: true,
    })
    api.defaults.adapter = failAdapter

    try { await api.get('/test') } catch { /* expected */ }
    vi.advanceTimersByTime(3000) // debounce → OFFLINE

    expect(mockEmit).toHaveBeenCalledWith('api:offline')
    mockEmit.mockClear()

    // Suspend and resume (health check will fail too)
    bus.emit('app:hidden')
    bus.emit('app:visible')

    // Let health check fail
    await vi.advanceTimersByTimeAsync(0)

    // Grace period expires (5s)
    vi.advanceTimersByTime(5000)
    await vi.advanceTimersByTimeAsync(0)

    // Should re-emit api:offline since we were offline before
    expect(mockEmit).toHaveBeenCalledWith('api:offline')
  })
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `pnpm --filter frontend exec vitest run src/lib/__tests__/api.spec.ts`
Expected: New tests FAIL (existing tests still pass — we haven't changed production code yet).

- [ ] **Step 3: Implement state machine in api.ts**

Replace lines 30–56 (state variables + `startRetryMechanism`) in `apps/frontend/src/lib/api.ts` with:

```ts
import './visibility'

// ── State machine ─────────────────────────────────────────────────────
type OfflineState = 'ONLINE' | 'DEBOUNCING' | 'OFFLINE' | 'SUSPENDED' | 'RESUMING'

let state: OfflineState = 'ONLINE'
let debounceTimerId: ReturnType<typeof setTimeout> | null = null
let retryTimerId: ReturnType<typeof setTimeout> | null = null
let graceTimerId: ReturnType<typeof setTimeout> | null = null
let wasOfflineBeforeSuspend = false
let waitForRecovery: (() => void)[] = []

export const isApiOnline = () =>
  state === 'ONLINE'
    ? Promise.resolve()
    : new Promise<void>((resolve) => waitForRecovery.push(resolve))

/** For testing only — returns the current state machine state. */
export const _getState = () => state

function clearAllTimers() {
  if (debounceTimerId) { clearTimeout(debounceTimerId); debounceTimerId = null }
  if (retryTimerId) { clearTimeout(retryTimerId); retryTimerId = null }
  if (graceTimerId) { clearTimeout(graceTimerId); graceTimerId = null }
}

function startRetryMechanism() {
  if (retryTimerId) clearTimeout(retryTimerId)
  retryTimerId = setTimeout(async () => {
    try {
      await getVersionInfo({ timeout: 5000 })
    } catch {
      if (state === 'OFFLINE') startRetryMechanism()
    }
  }, 10000)
}

function transitionTo(newState: OfflineState) {
  const prev = state
  state = newState

  switch (newState) {
    case 'ONLINE':
      clearAllTimers()
      if (prev === 'OFFLINE' || prev === 'RESUMING') {
        bus.emit('api:online')
        waitForRecovery.forEach((fn) => fn())
        waitForRecovery = []
      }
      break

    case 'DEBOUNCING':
      debounceTimerId = setTimeout(() => {
        debounceTimerId = null
        transitionTo('OFFLINE')
      }, 3000)
      break

    case 'OFFLINE':
      bus.emit('api:offline')
      startRetryMechanism()
      break

    case 'SUSPENDED':
      wasOfflineBeforeSuspend = prev === 'OFFLINE'
      clearAllTimers()
      break

    case 'RESUMING':
      graceTimerId = setTimeout(() => {
        graceTimerId = null
        if (wasOfflineBeforeSuspend) {
          transitionTo('OFFLINE')
        } else {
          state = 'ONLINE' // silent transition, no emit needed
        }
      }, 5000)
      // Proactive health check — its success/failure feeds into the interceptor
      getVersionInfo({ timeout: 5000 }).catch(() => {})
      break
  }
}

// ── Visibility event handlers ─────────────────────────────────────────
bus.on('app:hidden', () => {
  if (state === 'ONLINE' || state === 'DEBOUNCING' || state === 'OFFLINE') {
    transitionTo('SUSPENDED')
  }
})

bus.on('app:visible', () => {
  if (state === 'SUSPENDED') {
    transitionTo('RESUMING')
  }
})
```

Replace the response interceptor success handler (lines 79–98) with:

```ts
api.interceptors.response.use(
  (response) => {
    if (state === 'SUSPENDED') return response // don't transition while suspended

    if (state !== 'ONLINE') {
      transitionTo('ONLINE')
    }

    return response
  },
```

Replace the network error handling block in the error interceptor (lines 148–158) with:

```ts
    // Network error handling — visibility-aware state machine
    const isNetworkError = !error.response || ERROR_CODES.includes(error.code)

    if (isNetworkError && state === 'ONLINE') {
      transitionTo('DEBOUNCING')
    }
    // In SUSPENDED or RESUMING: swallow network errors (expected during tab transitions)
    // In DEBOUNCING or OFFLINE: already handling, no-op

    return Promise.reject(error)
  }
)
```

Replace `safeApiCall` (lines 164–184) with:

```ts
export async function safeApiCall<T>(fn: () => Promise<T>): Promise<T> {
  while (state !== 'ONLINE') {
    await isApiOnline()
  }

  try {
    return await fn()
  } catch (err: any) {
    const isNetworkError = !err.response || ERROR_CODES.includes(err.code)

    if (isNetworkError) {
      if (state === 'ONLINE') {
        transitionTo('DEBOUNCING')
      }
      await isApiOnline()
      return safeApiCall(fn)
    }

    throw err
  }
}
```

Remove the old `isOffline` boolean, `offlineDebounceId`, and `retryTimeoutId` variables (they are replaced by the state machine variables).

Remove the old `isApiOnline` export (replaced above).

- [ ] **Step 4: Run all api tests**

Run: `pnpm --filter frontend exec vitest run src/lib/__tests__/api.spec.ts`
Expected: ALL tests pass (existing + new).

- [ ] **Step 5: Fix the afterEach cleanup in api.spec.ts**

The existing `afterEach` in `api.spec.ts` (lines 33–59) resets module state by flushing timers and making a success request. With the state machine, it also needs to handle SUSPENDED/RESUMING states. Update it:

```ts
  afterEach(async () => {
    // Reset state machine: emit app:visible in case we're SUSPENDED,
    // then make a successful request to get back to ONLINE
    const { bus } = await import('../bus')
    bus.emit('app:visible')

    const successAdapter = vi.fn().mockResolvedValue({
      status: 200,
      data: {},
      headers: {},
      config: {},
      statusText: 'OK',
    })
    api.defaults.adapter = successAdapter
    vi.advanceTimersByTime(5000) // flush grace + debounce timers
    await vi.advanceTimersByTimeAsync(0)
    try {
      await api.get('/reset')
    } catch {
      // ignore
    }
    vi.advanceTimersByTime(15000) // flush retry timers
    await vi.advanceTimersByTimeAsync(0)
    api.defaults.adapter = originalAdapter
    vi.useRealTimers()
  })
```

- [ ] **Step 6: Run full api test suite again**

Run: `pnpm --filter frontend exec vitest run src/lib/__tests__/api.spec.ts`
Expected: ALL tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/lib/api.ts apps/frontend/src/lib/__tests__/api.spec.ts
git commit -m "feat: replace offline detection booleans with visibility-aware state machine

Network errors while the tab is hidden (SUSPENDED) or resuming (RESUMING)
are suppressed instead of triggering the error overlay. safeApiCall now
respects the state machine instead of bypassing the debounce."
```

---

## Task 3: Visibility-driven WebSocket lifecycle

**Files:**
- Modify: `src/lib/websocket.ts:1-89`
- Modify: `src/lib/__tests__/websocket.spec.ts`

- [ ] **Step 1: Write failing tests for visibility-driven WS lifecycle**

Add these test cases to `apps/frontend/src/lib/__tests__/websocket.spec.ts`, inside the existing `describe('websocket', ...)` block, after the last `it(...)`:

```ts
  // ── visibility-driven lifecycle ─────────────────────────────────────

  it('disconnects WebSocket on app:hidden', async () => {
    await connectWebSocket()
    mockClose.mockClear()

    const handler = getBusHandler('app:hidden')
    expect(handler).toBeDefined()
    handler!()

    expect(mockClose).toHaveBeenCalled()
  })

  it('does NOT fetch ticket on disconnect triggered by app:hidden', async () => {
    await connectWebSocket()
    mockApiGet.mockClear()

    const hiddenHandler = getBusHandler('app:hidden')
    hiddenHandler!()

    // Simulate onDisconnected firing after close
    const options = wsOptions()
    const onDisconnected = options.onDisconnected as () => void
    onDisconnected()

    await Promise.resolve()
    await Promise.resolve()

    // fetchTicketUrl should NOT have been called because isIntentionalClose is true
    expect(mockApiGet).not.toHaveBeenCalled()
  })

  it('reconnects WebSocket on app:visible if was previously connected', async () => {
    await connectWebSocket()
    mockApiGet.mockClear()
    mockApiGet.mockResolvedValue({ data: { ticket: 'ticket-resume' } })

    // Go hidden then visible
    const hiddenHandler = getBusHandler('app:hidden')
    hiddenHandler!()

    const visibleHandler = getBusHandler('app:visible')
    await visibleHandler!()

    expect(mockApiGet).toHaveBeenCalledWith('/auth/ws-ticket')
    // Two total: initial + reconnect after visibility
    expect(mockUseWebSocket).toHaveBeenCalledTimes(2)
  })

  it('does NOT reconnect on app:visible if never connected', async () => {
    // No prior connectWebSocket() call

    const visibleHandler = getBusHandler('app:visible')
    expect(visibleHandler).toBeDefined()
    await visibleHandler!()

    expect(mockApiGet).not.toHaveBeenCalled()
  })

  it('does NOT reconnect on app:visible after auth:logout', async () => {
    await connectWebSocket()

    // Simulate logout
    const logoutHandler = getBusHandler('auth:logout')
    logoutHandler!()

    mockApiGet.mockClear()

    // Go hidden then visible
    const hiddenHandler = getBusHandler('app:hidden')
    hiddenHandler!()

    const visibleHandler = getBusHandler('app:visible')
    await visibleHandler!()

    expect(mockApiGet).not.toHaveBeenCalled()
  })
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `pnpm --filter frontend exec vitest run src/lib/__tests__/websocket.spec.ts`
Expected: New tests FAIL — `app:hidden` and `app:visible` handlers not registered yet.

- [ ] **Step 3: Implement visibility-driven lifecycle in websocket.ts**

In `apps/frontend/src/lib/websocket.ts`, add a `wasConnected` flag and visibility event handlers.

Add after line 9 (`let isIntentionalClose = false`):

```ts
let wasConnected = false
```

Add after the existing `bus.on('api:online', ...)` block (after line 21):

```ts
bus.on('app:hidden', () => {
  if (wasConnected) {
    disconnectWebSocket()
  }
})

bus.on('app:visible', async () => {
  if (wasConnected && (!socket || socket.status.value !== 'OPEN')) {
    await connectWebSocket()
  }
})
```

In the `connectWebSocket` function, set `wasConnected = true` after socket creation succeeds. Add after the `socket = useWebSocket(...)` call (after line 79):

```ts
  wasConnected = true
```

The `onConnected` callback remains empty — setting `wasConnected` at socket creation time (not WebSocket open time) is more reliable because it ensures the flag is set even if the test mock doesn't fire the callback.

In the `disconnectWebSocket` function, do NOT clear `wasConnected` — it should persist across intentional disconnects from visibility transitions. It only resets on logout.

In the `bus.on('auth:logout', ...)` handler (line 11), add `wasConnected = false`:

```ts
bus.on('auth:logout', () => {
  wasConnected = false
  disconnectWebSocket()
})
```

- [ ] **Step 4: Run all websocket tests**

Run: `pnpm --filter frontend exec vitest run src/lib/__tests__/websocket.spec.ts`
Expected: ALL tests pass (existing + new).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/lib/websocket.ts apps/frontend/src/lib/__tests__/websocket.spec.ts
git commit -m "feat: proactive WS disconnect/reconnect on visibility transitions

Cleanly disconnects the WebSocket when the tab goes hidden (avoiding
stale-ticket races and spurious fetchTicketUrl calls), and reconnects
with a fresh ticket when the tab becomes visible again."
```

---

## Task 4: Import visibility.ts and run full test suite

**Files:**
- Modify: `src/lib/api.ts` (import already added in Task 2)

- [ ] **Step 1: Verify visibility.ts is imported**

The `import './visibility'` was added at the top of `api.ts` in Task 2. Since `api.ts` is imported by virtually every store and component, `visibility.ts` self-initializes on app boot. Verify it's present.

- [ ] **Step 2: Run the full frontend test suite**

Run: `pnpm --filter frontend test`
Expected: ALL tests pass.

- [ ] **Step 3: Run type checking**

Run: `pnpm type-check`
Expected: No type errors.

- [ ] **Step 4: Format changed files**

```bash
pnpm exec prettier --write \
  apps/frontend/src/lib/bus.ts \
  apps/frontend/src/lib/visibility.ts \
  apps/frontend/src/lib/api.ts \
  apps/frontend/src/lib/websocket.ts \
  apps/frontend/src/lib/__tests__/visibility.spec.ts \
  apps/frontend/src/lib/__tests__/api.spec.ts \
  apps/frontend/src/lib/__tests__/websocket.spec.ts
```

- [ ] **Step 5: Run lint**

Run: `pnpm lint`
Expected: No lint errors on changed files.

- [ ] **Step 6: Commit any formatting fixes**

```bash
git add -u
git commit -m "style: format visibility-aware offline detection files"
```

(Skip this commit if prettier/lint made no changes.)

---

## Task 5: Manual verification in browser

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`

- [ ] **Step 2: Open the app and log in**

Navigate to `https://localhost:5173/auth`, enter `me@example.org`, complete the login flow.

- [ ] **Step 3: Verify normal offline detection still works**

- Stop the backend (`Ctrl+C` on the backend process or `docker compose stop backend-deps`)
- Verify the `ApiErrorOverlay` appears after ~3 seconds
- Restart the backend
- Verify the overlay disappears and `api:online` fires

- [ ] **Step 4: Simulate mobile visibility transition**

- Open browser DevTools → Console
- While on any authenticated page, run: `document.dispatchEvent(new Event('visibilitychange'))` after setting `Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })`
- Verify NO error overlay appears
- Set `visibilityState` back to `'visible'` and dispatch again
- Verify the app recovers cleanly, WebSocket reconnects (check console for `[WS]` logs)

- [ ] **Step 5: Verify no overlay flash**

- On a mobile device or mobile emulator, navigate to an authenticated page
- Switch to another app, wait 5+ seconds, switch back
- Verify NO flash of the error overlay
