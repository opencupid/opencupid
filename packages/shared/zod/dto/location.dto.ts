import z from "zod";


export const LocationSchema = z.object({
  country: z.string(),
  // cityId: z.string().nullable(),
  cityName: z.string().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
})

export const LocationPayloadSchema = z.object({
  country: z.string().nullable(),
  // cityId: z.string().nullable(),
  cityName: z.string().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
})


export const SearchLocationSchema = z.object({
  country: z.string().nullable(),
  // cityId: z.string().nullable(),
  cityName: z.string().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
})


export type LocationPayload = z.infer<typeof LocationPayloadSchema>

export type LocationDTO = z.infer<typeof LocationSchema>

export type SearchLocationDTO = z.infer<typeof SearchLocationSchema>


