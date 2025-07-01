import { z } from 'zod'

export const VersionSchema = z.object({
  version: z.string(),
  commit: z.string(),
  timestamp: z.string().datetime(),
})

export type VersionDTO = z.infer<typeof VersionSchema>