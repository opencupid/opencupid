import { z } from 'zod'

export const BoundsSchema = z.object({
  south: z.number(),
  north: z.number(),
  west: z.number(),
  east: z.number(),
})

/** Coerced variant for HTTP query-string parsing (string → number). */
export const BoundsQuerySchema = BoundsSchema.extend({
  south: z.coerce.number(),
  north: z.coerce.number(),
  west: z.coerce.number(),
  east: z.coerce.number(),
})

export type Bounds = z.infer<typeof BoundsSchema>
