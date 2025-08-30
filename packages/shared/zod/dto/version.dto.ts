import { z } from 'zod'

export const VersionSchema = z.object({
  version: z.string(),
  commit: z.string(),
  timestamp: z.string().datetime(),
  app: z.string(),
  frontend: z.string(),
  backend: z.string(),
})

export type VersionDTO = z.infer<typeof VersionSchema>