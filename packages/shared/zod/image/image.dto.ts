import { z } from 'zod'

export const ImageOwnerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('profile'), profileId: z.string().cuid() }),
  z.object({ type: z.literal('userContent'), userContentId: z.string().cuid() }),
])

export type ImageOwner = z.infer<typeof ImageOwnerSchema>

export const ImageOwnerRouteParamsSchema = z.object({
  ownerType: z.enum(['profile', 'userContent']),
  ownerId: z.string().cuid(),
})

export type ImageOwnerRouteParams = z.infer<typeof ImageOwnerRouteParamsSchema>
