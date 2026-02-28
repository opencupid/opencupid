import z from "zod";


export const LocationSchema = z.object({
  country: z.string(),
  cityName: z.string().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
})

export const LocationPayloadSchema = z.object({
  country: z.string().nullable(),
  cityName: z.string().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
})


export type LocationPayload = z.infer<typeof LocationPayloadSchema>

export type LocationDTO = z.infer<typeof LocationSchema>


