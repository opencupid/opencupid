import { prisma } from '@/lib/prisma'
import { notifierService } from './notifier.service'
import { appConfig } from '@/lib/appconfig'

/**
 * Find users who registered within the given time window
 * and have not completed onboarding, then send them a single reminder email.
 *
 * @param windowStart - start of the registration window (inclusive)
 * @param windowEnd   - end of the registration window (exclusive)
 *
 * Idempotency: each email job uses a deterministic jobId based on the user ID,
 * so BullMQ deduplicates if this function runs more than once for the same window.
 */
export async function sendOnboardingReminders(
  windowStart: Date,
  windowEnd: Date,
  onProgress?: (sent: number, total: number, userId: string) => Promise<void> | void
): Promise<number> {
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

  // TODO: select email/language/profile fields in findMany and call notifyResolvedUser
  // directly to avoid N+1 queries (notifyUser re-fetches each user individually)
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    await notifierService.notifyUser(user.id, 'onboarding_reminder', {
      link: onboardingUrl,
    })
    await onProgress?.(i + 1, users.length, user.id)
    // Stagger sends with a random 10-15s delay to avoid hitting SMTP rate limits
    if (i < users.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 10_000 + Math.random() * 5_000))
    }
  }

  return users.length
}
