/**
 * One-off backfill script: send onboarding reminder emails to all users
 * who registered in the past N days and haven't completed onboarding.
 *
 * Uses the same jobId pattern as the daily cron (`onboarding_reminder-{userId}`),
 * so it's safe to run multiple times — BullMQ deduplicates.
 *
 * Usage:
 *   node scripts/backfill-onboarding-reminders.js [days]
 *
 * Examples:
 *   node scripts/backfill-onboarding-reminders.js        # default: 4 days
 *   node scripts/backfill-onboarding-reminders.js 7      # past 7 days
 *   node scripts/backfill-onboarding-reminders.js --dry   # dry run (default 4 days)
 *   node scripts/backfill-onboarding-reminders.js 7 --dry # dry run, 7 days
 */

require('dotenv/config')
const { PrismaClient } = require('@prisma/client')
const { Queue } = require('bullmq')
const IORedis = require('ioredis')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry')
const daysArg = args.find((a) => !a.startsWith('--'))
const days = daysArg ? parseInt(daysArg, 10) : 4

async function main() {
  const prisma = new PrismaClient()
  const conn = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  const emailQueue = new Queue('emails', { connection: conn })

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const users = await prisma.user.findMany({
    where: {
      createdAt: { gte: cutoff },
      email: { not: null },
      OR: [{ profile: null }, { profile: { isOnboarded: false } }],
    },
    select: { id: true, email: true, language: true, profile: { select: { publicName: true } } },
  })

  console.log(`Found ${users.length} users (registered in past ${days} days, not onboarded)`)
  if (dryRun) {
    users.forEach((u) => console.log(`  [dry] ${u.email}`))
    console.log('Dry run — no emails sent')
    await conn.quit()
    await prisma.$disconnect()
    return
  }

  const siteName = process.env.SITE_NAME
  const frontendUrl = process.env.FRONTEND_URL

  for (const u of users) {
    await emailQueue.add(
      'sendEmail',
      {
        to: u.email,
        subject: `[${siteName}] Your profile is waiting for you`,
        templateProps: {
          siteName,
          publicName: u.profile?.publicName || '',
          contentBody: `Hey there, you started setting up your profile on ${siteName} but have not finished yet. It only takes a minute — complete your profile and start connecting with people!`,
          callToActionLabel: 'Complete my profile',
          callToActionUrl: `${frontendUrl}/onboarding`,
          fallbackHint: 'If the button does not work, copy and paste this URL:',
          footer: '',
        },
      },
      {
        jobId: `onboarding_reminder-${u.id}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      }
    )
    console.log(`Queued: ${u.email}`)
    // Stagger sends with a random 10-15s delay to avoid hitting SMTP rate limits
    if (users.indexOf(u) < users.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 10_000 + Math.random() * 5_000))
    }
  }

  console.log(`Done — ${users.length} emails queued`)
  await conn.quit()
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
