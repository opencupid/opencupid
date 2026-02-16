import { z } from 'zod'

export const VersionSchema = z.object({
  version: z.string(),
  commit: z.string().optional(),
  timestamp: z.string().datetime().optional(),
})

export type VersionDTO = z.infer<typeof VersionSchema>