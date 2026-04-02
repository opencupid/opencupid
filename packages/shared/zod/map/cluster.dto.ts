import { z } from 'zod'

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
})

export const MapFeatureSchema = z.discriminatedUnion('type', [
  ClusterFeatureSchema,
  PointFeatureSchema,
])

export const ClusterMapResponseSchema = z.object({
  success: z.literal(true),
  features: z.array(MapFeatureSchema),
})

export type ClusterFeature = z.infer<typeof ClusterFeatureSchema>
export type PointFeature = z.infer<typeof PointFeatureSchema>
export type MapFeature = z.infer<typeof MapFeatureSchema>
export type ClusterMapResponse = z.infer<typeof ClusterMapResponseSchema>
