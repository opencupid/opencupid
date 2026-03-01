import { z } from 'zod'

export const VersionSchema = z.object({
  frontendVersion: z.string(),
  backendVersion: z.string(),
  updateAvailable: z.boolean(),
  currentVersion: z.string().optional(),
})

export type VersionDTO = z.infer<typeof VersionSchema>
