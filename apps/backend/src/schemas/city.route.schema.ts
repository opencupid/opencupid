import { z } from 'zod'
import { CitySchema as DbCitySchema } from '@zod/generated'

/**
 * City record returned from the database with extra validations
 */
export const CityRecordSchema = DbCitySchema.extend({
  country: DbCitySchema.shape.country.regex(/^[A-Z]{2}$/, 'ISO2 country code'),
  lat: DbCitySchema.shape.lat.refine(v => v >= -90 && v <= 90, {
    message: 'Latitude must be between -90 and 90',
  }),
  lon: DbCitySchema.shape.lon.refine(v => v >= -180 && v <= 180, {
    message: 'Longitude must be between -180 and 180',
  }),
})

/**
 * Input schema for creating a new city (id is auto-generated)
 */
export const CityCreateSchema = CityRecordSchema.omit({ id: true })

/**
 * Query parameters for listing/searching cities
 */
export const CityQuerySchema = z.object({
  q: z.string().optional(),
  country: z.string().length(2).optional(),
  limit: z.preprocess(
    val => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(1).max(100).default(50)
  ),
  offset: z.preprocess(
    val => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(0).default(0)
  ),
})

export type CityRecord = z.infer<typeof CityRecordSchema>
export type CityCreate = z.infer<typeof CityCreateSchema>
export type CityQuery = z.infer<typeof CityQuerySchema>
