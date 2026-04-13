import { z } from 'zod'
import { PublicTagSchema } from '../tag/tag.dto'

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
  kind: z.enum(['profile', 'post']),
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
