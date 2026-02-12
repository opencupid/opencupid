import { z } from 'zod'

export const VersionSchema = z.object({
  version: z.string(),
  commit: z.string().optional(),
  timestamp: z.string().datetime().optional(),
})

export type VersionDTO = z.infer<typeof VersionSchema>

export const UpdateAvailableSchema = z.object({
  updateAvailable: z.boolean(),
  currentVersion: z.string(),
  latestVersion: z.string(),
})

export type UpdateAvailableDTO = z.infer<typeof UpdateAvailableSchema>