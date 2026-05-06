import { z } from 'zod'
import { PublicTagSchema } from '../tag/tag.dto'
import { MAP_LAYER_KINDS } from '../../maps'

export const ClusterFeatureSchema = z.object({
  type: z.literal('cluster'),
  id: z.number(),
  lat: z.number(),
  lon: z.number(),
  count: z.number().int().min(2),
  expansionZoom: z.number().int(),
})

export const PointFeatureSchema = z.object({
  type: z.literal('point'),
  kind: z.enum(MAP_LAYER_KINDS),
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
  postType: z.string().optional(),
})

export const MapFeatureSchema = z.discriminatedUnion('type', [
  ClusterFeatureSchema,
  PointFeatureSchema,
])

export const ClusterMapResponseSchema = z.object({
  success: z.literal(true),
  features: z.array(MapFeatureSchema),
  tags: z.array(PublicTagSchema),
})

export type ClusterFeature = z.infer<typeof ClusterFeatureSchema>
export type PointFeature = z.infer<typeof PointFeatureSchema>
export type MapFeature = z.infer<typeof MapFeatureSchema>
export type ClusterMapResponse = z.infer<typeof ClusterMapResponseSchema>

/**
 * Parses a comma-separated `kinds` query param into a deduped, sorted array
 * of `MapLayerKind` values. Empty input is rejected by `.min(1)` — callers
 * must explicitly select at least one layer. Mirrors the parser style used
 * for `tagIds` in `findProfile.route.ts`.
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
  .pipe(z.array(z.enum(MAP_LAYER_KINDS)).min(1).max(MAP_LAYER_KINDS.length))
