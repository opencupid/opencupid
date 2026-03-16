import { axios } from '@/lib/api'
import type { FeatureCollection, Point } from 'geojson'
import type { GeocodingProvider, GeocodingResult } from '../types'

interface NominatimProperties {
  name: string
  address: {
    country_code: string
  }
}

export const searchNominatim: GeocodingProvider = async (query, lang) => {
  const params = new URLSearchParams()
  params.set('q', query)
  params.set('format', 'geojson')
  params.set('addressdetails', '1')
  params.set('limit', '10')
  params.set('featureType', 'city')
  params.set('accept-language', lang)

  const res = await axios.get<FeatureCollection<Point, NominatimProperties>>(
    'https://nominatim.openstreetmap.org/search',
    {
      params,
      headers: { 'User-Agent': 'OpenCupid/1.0' },
    }
  )

  return (res.data.features ?? []).map(
    (f): GeocodingResult => ({
      name: f.properties.name,
      country: f.properties.address.country_code.toUpperCase(),
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
    })
  )
}
