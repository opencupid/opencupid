import { z } from 'zod'
import { PublicTagSchema } from '../tag/tag.dto'
import { USER_CONTENT_KINDS } from '../../maps'

/**
 * A single POI on the map: a profile, post, event or community located at
 * a real geographic coordinate. The map is fully bounds-driven — the
 * backend returns visible POIs in the viewport (subject to the upstream
 * row cap in the profile/content fetchers) and the frontend applies
 * density-based spreading at render time when they overlap in pixel space.
 */
export const PointFeatureSchema = z.object({
  type: z.literal('point'),
  kind: z.enum(USER_CONTENT_KINDS),
  id: z.string(),
  lat: z.number(),
  lon: z.number(),
  publicName: z.string(),
  image: z
    .object({
      blurhash: z.string().nullish(),
      url: z.string().optional(),
    })
    .nullable(),
  highlighted: z.boolean(),
  hasPost: z.boolean().optional(),
  postContent: z.string().optional(),
})

export const BoundsMapResponseSchema = z.object({
  success: z.literal(true),
  features: z.array(PointFeatureSchema),
  tags: z.array(PublicTagSchema),
})

export type PointFeature = z.infer<typeof PointFeatureSchema>
export type BoundsMapResponse = z.infer<typeof BoundsMapResponseSchema>

/**
 * Parses a comma-separated `kinds` query param into a deduped array of
 * `UserContentKind` values. Empty input is rejected by `.min(1)` — callers
 * must explicitly select at least one kind. Mirrors the parser style used
 * for `tagIds` in `findProfile.route.ts`. Order is preserved from input;
 * cache-key callers sort separately when stability is required.
 */
export const KindsSchema = z
  .string()
  .default('')
  .transform((raw) => [
    ...new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ])
  .pipe(z.array(z.enum(USER_CONTENT_KINDS)).min(1).max(USER_CONTENT_KINDS.length))
