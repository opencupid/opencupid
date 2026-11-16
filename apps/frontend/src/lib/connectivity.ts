/**
 * Why the API cannot be reached:
 * - `network`: the device has no working connection — the problem is at the user's end.
 * - `api`: the device is connected but the API is unavailable — the problem is at our end.
 */
export type OutageCause = 'network' | 'api'

const PROBE_TIMEOUT = 5000

/**
 * Asks the app's own origin for a tiny static file. The SPA is served
 * independently of the API, so any HTTP answer at all — whatever its status —
 * proves the device has a working connection.
 */
async function isAppOriginReachable(): Promise<boolean> {
  try {
    await fetch(`${window.location.origin}/sw.js`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT),
    })
    return true
  } catch {
    return false
  }
}

/**
 * Classifies an API outage from the most recent failed request.
 * Evidence is consulted from cheapest and most certain to least:
 * 1. an HTTP response was received — the request crossed the network;
 * 2. the browser reports having no network interface;
 * 3. a probe of the app origin tells a dead connection from a dead API.
 */
export async function diagnoseOutage(lastError?: { response?: unknown }): Promise<OutageCause> {
  if (lastError?.response) return 'api'
  if (!navigator.onLine) return 'network'
  return (await isAppOriginReachable()) ? 'api' : 'network'
}
