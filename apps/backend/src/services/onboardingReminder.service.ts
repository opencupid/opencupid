import { prisma } from '@/lib/prisma'
import { notifierService } from './notifier.service'
import { appConfig } from '@/lib/appconfig'

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

/**
 * Find users who registered exactly 3 calendar days ago (within a 24h window)
 * and have not completed onboarding, then send them a single reminder email.
 *
 * Idempotency: each email job uses a deterministic jobId based on the user ID,
 * so BullMQ deduplicates if this function runs more than once for the same window.
 */
export async function sendOnboardingReminders(): Promise<number> {
  const now = Date.now()
  const windowStart = new Date(now - THREE_DAYS_MS - 24 * 60 * 60 * 1000) // 4 days ago
  const windowEnd = new Date(now - THREE_DAYS_MS) // 3 days ago

  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: windowStart,
        lt: windowEnd,
      },
      email: { not: null },
      OR: [{ profile: null }, { profile: { isOnboarded: false } }],
    },
    select: {
      id: true,
    },
  })

  const onboardingUrl = `${appConfig.FRONTEND_URL}/onboarding`

  for (const user of users) {
    await notifierService.notifyUser(user.id, 'onboarding_reminder', {
      link: onboardingUrl,
    })
  }

  return users.length
}
