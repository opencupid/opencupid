import { z } from 'zod'

export const VersionSchema = z.object({
  version: z.string(),
})

export type VersionDTO = z.infer<typeof VersionSchema>