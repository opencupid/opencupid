export function getLast7Days(): string[] {
  const dates: string[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

export function fillZeroDays(
  rows: { date: string; count: bigint }[],
  days: string[]
): { date: string; count: number }[] {
  const map = new Map(rows.map((r) => [r.date, Number(r.count)]))
  return days.map((date) => ({ date, count: map.get(date) ?? 0 }))
}
