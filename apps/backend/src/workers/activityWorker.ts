import { distillActivitySegments } from '@/services/activityDistill.service'
import { syncHiddenFromResults } from '@/services/profileVisibility.service'

export async function processActivityDistillJob(): Promise<void> {
  await distillActivitySegments()
  // Runs after the distill because it reads the lastSeenAt the distill just wrote.
  await syncHiddenFromResults()
}
