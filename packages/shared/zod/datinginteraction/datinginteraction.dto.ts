

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