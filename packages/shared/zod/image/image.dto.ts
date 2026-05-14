import { z } from 'zod'

// Service-input shape: typed access to the owner's specific FK column.
export const ImageOwnerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('profile'), profileId: z.string().cuid() }),
  z.object({ type: z.literal('userContent'), userContentId: z.string().cuid() }),
])

export type ImageOwner = z.infer<typeof ImageOwnerSchema>

// URL-param shape: flat strings parsed from `/image/:ownerType/:ownerId`.
// The route layer maps this into an ImageOwner before calling the service.
export const ImageOwnerRouteParamsSchema = z.object({
  ownerType: z.enum(['profile', 'userContent']),
  ownerId: z.string().cuid(),
})

export type ImageOwnerRouteParams = z.infer<typeof ImageOwnerRouteParamsSchema>
