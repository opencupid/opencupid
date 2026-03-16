import { axios } from '@/lib/api'
import type { FeatureCollection, Point } from 'geojson'
import type { GeocodingProvider, GeocodingResult } from '../types'

interface PhotonProperties {
  name: string
  countrycode: string
}

const SUPPORTED_LANGS = ['en', 'de']
const OSM_TAG_FILTERS = ['place:city', 'place:town', 'place:village', 'place:hamlet']

export const searchPhoton: GeocodingProvider = async (query, lang) => {
  const params = new URLSearchParams()
  params.set('q', query)
  params.set('lang', SUPPORTED_LANGS.includes(lang) ? lang : 'en')
  params.set('limit', '10')
  for (const tag of OSM_TAG_FILTERS) {
    params.append('osm_tag', tag)
  }
  params.append('layer', 'city')
  params.append('layer', 'locality')

  const res = await axios.get<FeatureCollection<Point, PhotonProperties>>(
    'https://photon.komoot.io/api/',
    { params }
  )

  return (res.data.features ?? []).map(
    (f): GeocodingResult => ({
      name: f.properties.name,
      country: f.properties.countrycode,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
    })
  )
}
