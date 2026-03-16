export interface GeocodingResult {
  name: string
  country: string // ISO 3166-1 alpha-2, uppercase (e.g. "DE")
  lat: number
  lon: number
}

export type GeocodingProvider = (query: string, lang: string) => Promise<GeocodingResult[]>
