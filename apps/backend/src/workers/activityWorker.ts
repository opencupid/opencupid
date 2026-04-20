import { distillActivitySegments } from '@/services/activityDistill.service'

export async function processActivityDistillJob(): Promise<void> {
  await distillActivitySegments()
}
