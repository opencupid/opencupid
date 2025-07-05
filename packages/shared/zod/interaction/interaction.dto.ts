import { z } from 'zod'
import { ProfileSummarySchema } from '@zod/profile/profile.dto'

export const InteractionEdgeSchema = z.object({
  profile: ProfileSummarySchema,
  isMatch: z.boolean(),
  createdAt: z.string().datetime(), // ISO format
})

export type InteractionEdge = z.infer<typeof InteractionEdgeSchema>

export const InteractionEdgePairSchema = z.object({
  to: InteractionEdgeSchema,
  from: InteractionEdgeSchema,
  isMatch: z.boolean(),
})

export type InteractionEdgePair = z.infer<typeof InteractionEdgePairSchema>

export const InteractionStatsSchema = z.object({
  sent: z.array(InteractionEdgeSchema),
  matches: z.array(InteractionEdgeSchema),
  newMatchesCount: z.number().default(0), 
  receivedLikesCount: z.number(),
})

export type InteractionStats = z.infer<typeof InteractionStatsSchema>
