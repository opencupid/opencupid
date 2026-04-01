import { prisma } from '@/lib/prisma'
import { notifierService } from './notifier.service'
import { appConfig } from '@/lib/appconfig'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Find users who registered exactly 1 calendar day ago (within a 24h window)
 * and have not completed onboarding, then send them a single reminder email.
 *
 * Idempotency: each email job uses a deterministic jobId based on the user ID,
 * so BullMQ deduplicates if this function runs more than once for the same window.
 */
export async function sendOnboardingReminders(): Promise<number> {
  const now = Date.now()
  const windowStart = new Date(now - 2 * ONE_DAY_MS) // 2 days ago
  const windowEnd = new Date(now - ONE_DAY_MS) // 1 day ago

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
