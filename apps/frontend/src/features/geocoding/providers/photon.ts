import { axios } from '@/lib/api'
import type { Feature, FeatureCollection, Point } from 'geojson'
import type { GeocodingProvider, GeocodingResult, ReverseGeocodingProvider } from '../types'

interface PhotonProperties {
  name: string
  countrycode: string
  /** [west, north, east, south] */
  extent?: [number, number, number, number]
}

type PhotonFeature = Feature<Point, PhotonProperties>

const PHOTON_URL = 'https://photon.komoot.io'
const SUPPORTED_LANGS = ['en', 'de']
const OSM_TAG_FILTERS = ['place:city', 'place:town', 'place:village', 'place:hamlet']
/** How far (km) reverse lookups look for a settlement. */
const REVERSE_RADIUS_KM = 15

/** Language plus the settlement filters shared by search and reverse lookups. */
function placeParams(lang: string): URLSearchParams {
  const params = new URLSearchParams()
  params.set('lang', SUPPORTED_LANGS.includes(lang) ? lang : 'en')
  for (const tag of OSM_TAG_FILTERS) {
    params.append('osm_tag', tag)
  }
  params.append('layer', 'city')
  params.append('layer', 'locality')
  return params
}

function isAllowedCountry(f: PhotonFeature): boolean {
  const allowed = (__APP_CONFIG__.GEOCODING_ALLOWED_COUNTRIES ?? '')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)
  return allowed.length === 0 || allowed.includes(f.properties.countrycode?.toUpperCase())
}

function toResult(f: PhotonFeature): GeocodingResult {
  const extent = f.properties.extent
  return {
    name: f.properties.name,
    country: f.properties.countrycode,
    lat: f.geometry.coordinates[1] ?? 0,
    lon: f.geometry.coordinates[0] ?? 0,
    ...(extent
      ? { bounds: { west: extent[0], north: extent[1], east: extent[2], south: extent[3] } }
      : {}),
  }
}

export const searchPhoton: GeocodingProvider = async (query, lang, signal?, bias?) => {
  const params = placeParams(lang)
  params.set('q', query)
  params.set('limit', '50')
  if (bias) {
    params.set('lat', String(bias.lat))
    params.set('lon', String(bias.lon))
    // Photon defaults (zoom=12, location_bias_scale=0.4) leave prominence
    // strong enough that a faraway exact-name match (e.g. "Als" in DK) beats
    // nearby villages. Widen the radius and downweight prominence so the
    // bias point dominates ranking.
    params.set('zoom', '8')
    params.set('location_bias_scale', '0.0')
  }

  const res = await axios.get<FeatureCollection<Point, PhotonProperties>>(`${PHOTON_URL}/api/`, {
    params,
    signal,
  })

  return (res.data.features ?? []).filter(isAllowedCountry).map(toResult)
}

export const reversePhoton: ReverseGeocodingProvider = async (point, lang, signal?) => {
  const params = placeParams(lang)
  params.set('lat', String(point.lat))
  params.set('lon', String(point.lon))
  params.set('radius', String(REVERSE_RADIUS_KM))
  params.set('limit', '1')

  const res = await axios.get<FeatureCollection<Point, PhotonProperties>>(`${PHOTON_URL}/reverse`, {
    params,
    signal,
  })

  const match = (res.data.features ?? []).find(isAllowedCountry)
  return match ? toResult(match) : null
}
