import { prisma } from '@/lib/prisma'
import { notifierService } from './notifier.service'
import { emailPreferencesSelect } from './emailPreference.service'

/**
 * Find users who registered within the given time window
 * and have not completed onboarding, then send them a single reminder email.
 *
 * @param windowStart - start of the registration window (inclusive)
 * @param windowEnd   - end of the registration window (exclusive)
 *
 * Emails go on the rate-limited bulk queue, which paces them for SMTP.
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
      OR: [{ profile: null }, { profile: { isOnboarded: false } }],
    },
    include: {
      profile: { select: { publicName: true } },
      ...emailPreferencesSelect,
    },
  })

  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    await notifierService.notifyLoadedUser(user, 'onboarding_reminder', {
      path: '/onboarding',
    })
    await onProgress?.(i + 1, users.length, user.id)
  }

  return users.length
}
