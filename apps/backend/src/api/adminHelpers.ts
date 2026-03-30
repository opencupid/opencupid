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
