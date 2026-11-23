import type { Job } from 'bullmq'
import { z } from 'zod'
import { sendNearbyDigests } from '@/services/nearbyDigest.service'

/**
 * Job data schema. All fields are optional.
 *
 * dryRun: log who would get a digest without sending emails or writing log rows.
 *         Trigger `{ "dryRun": true }` from Bull Board to preview a run.
 * profileIds: only consider these profiles, e.g. a test cohort picked from a
 *         dry run. They still have to qualify.
 */
export const jobDataSchema = z.object({
  dryRun: z.boolean().default(false),
  profileIds: z.array(z.string()).nonempty().optional(),
})

export type NearbyDigestJobData = z.input<typeof jobDataSchema>

export async function processNearbyDigestJob(job: Job<NearbyDigestJobData>): Promise<void> {
  const { dryRun, profileIds } = jobDataSchema.parse(job.data ?? {})
  const now = new Date()
  const runDate = now.toISOString().slice(0, 10)
  const cohort = profileIds ? `, ${profileIds.length} profile(s)` : ''
  await job.log(`Run ${runDate}${dryRun ? ' (dry run)' : ''}${cohort}`)

  const count = await sendNearbyDigests({
    runDate,
    now,
    dryRun,
    profileIds,
    onRecipient: async (profileId, newCount) => {
      await job.log(`${dryRun ? 'would send' : 'queued'} digest for ${profileId}: ${newCount} new`)
    },
  })

  await job.log(count > 0 ? `Done — ${count} digest(s)` : 'No profiles qualified — nothing sent')
}
