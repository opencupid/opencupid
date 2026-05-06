export function getLastNDays(n: number): string[] {
  const dates: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

export function getLast7Days(): string[] {
  return getLastNDays(7)
}

export function fillZeroDays(
  rows: { date: string; count: bigint }[],
  days: string[]
): { date: string; count: number }[] {
  const map = new Map(rows.map((r) => [r.date, Number(r.count)]))
  return days.map((date) => ({ date, count: map.get(date) ?? 0 }))
}

export type BreakdownRange = '24h' | '72h' | '7d'
export type BreakdownUnit = 'hour' | 'day'

export interface BreakdownConfig {
  since: Date
  unit: BreakdownUnit
  buckets: Date[]
}

/**
 * Build a list of bucket start instants ending at the current hour/day
 * boundary. Used by the dashboard drill-down endpoint to render uniform
 * timelines. All buckets are aligned to UTC.
 */
export function getBreakdownConfig(range: BreakdownRange): BreakdownConfig {
  const now = new Date()
  if (range === '7d') {
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const buckets: Date[] = []
    for (let i = 6; i >= 0; i--) {
      buckets.push(new Date(todayUtc - i * 86_400_000))
    }
    return { since: buckets[0], unit: 'day', buckets }
  }
  const hours = range === '24h' ? 24 : 72
  const hourUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours()
  )
  const buckets: Date[] = []
  for (let i = hours - 1; i >= 0; i--) {
    buckets.push(new Date(hourUtc - i * 3_600_000))
  }
  return { since: buckets[0], unit: 'hour', buckets }
}

/**
 * Format pattern matching the bucket key emitted by Postgres `to_char`. Hour
 * buckets stop at the hour to match Date.toISOString().slice(0, 13).
 */
export function bucketFormat(unit: BreakdownUnit): string {
  return unit === 'hour' ? 'YYYY-MM-DD"T"HH24' : 'YYYY-MM-DD'
}

export function bucketKey(d: Date, unit: BreakdownUnit): string {
  const iso = d.toISOString()
  return unit === 'hour' ? iso.slice(0, 13) : iso.slice(0, 10)
}

export function fillZeroBuckets(
  rows: { bucket: string; count: bigint }[],
  buckets: Date[],
  unit: BreakdownUnit
): { bucket: string; count: number }[] {
  const map = new Map(rows.map((r) => [r.bucket, Number(r.count)]))
  return buckets.map((d) => ({
    bucket: d.toISOString(),
    count: map.get(bucketKey(d, unit)) ?? 0,
  }))
}
