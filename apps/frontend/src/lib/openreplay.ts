// Eagerly imported wrapper. The env-var gate runs first so the
// @openreplay/tracker package (~50 KB gz) is only fetched when OpenReplay
// is actually configured for this environment.
export async function initOpenReplay(): Promise<void> {
  const { OPENREPLAY_PROJECT_KEY, OPENREPLAY_INGEST_POINT } = __APP_CONFIG__
  if (!OPENREPLAY_PROJECT_KEY || !OPENREPLAY_INGEST_POINT) return

  const { default: Tracker } = await import('@openreplay/tracker')
  const tracker = new Tracker({
    projectKey: OPENREPLAY_PROJECT_KEY,
    ingestPoint: OPENREPLAY_INGEST_POINT,
  })
  tracker.start()
}
