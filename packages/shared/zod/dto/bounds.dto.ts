import { z } from 'zod'

export const BoundsSchema = z.object({
  south: z.number(),
  north: z.number(),
  west: z.number(),
  east: z.number(),
})

export type Bounds = z.infer<typeof BoundsSchema>
