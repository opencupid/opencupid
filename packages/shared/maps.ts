/** Maximum zoom level used by the map and the supercluster index. */
export const MAP_MAX_ZOOM = 12

/**
 * Supercluster `radius`: points within it of a cluster's seed join the
 * cluster. Measured in Supercluster's 512-px tile extent, i.e. half as many
 * screen pixels on the map's 256-px tiles.
 */
export const MAP_CLUSTER_RADIUS = 40

/**
 * Lowest map zoom at which the browse grid can be opened from the map. The
 * grid lists everything in the map area, so a minimum zoom keeps it from
 * listing whole regions at once (bulk harvesting).
 */
export const BROWSE_GRID_MIN_ZOOM = 11

/** Default zoom level used on map initialization. */
export const MAP_DEFAULT_ZOOM = 8

/**
 * Fallback map center used when the viewer profile has no resolved
 * coordinates. A centroid over Central Europe so users land somewhere
 * usable and can pan from there.
 */
export const MAP_DEFAULT_CENTER: [number, number] = [50, 14]

/** Maximum number of tag IDs accepted for browse filtering. */
export const MAX_BROWSE_TAGS = 5

/**
 * Discriminator values for the kinds of user-generated content that appear on
 * the social map. Used by the wire-level `kinds` filter, the supercluster
 * point properties, and the `<MapLayerControl>` button group. Aligned with
 * the existing UserContent terminology in the backend mappers.
 */
export const USER_CONTENT_KINDS = ['profile', 'post', 'event', 'community'] as const
export type UserContentKind = (typeof USER_CONTENT_KINDS)[number]

const EARTH_RADIUS_KM = 6371

/** Great-circle distance in kilometres between two `{ lat, lon }` points (haversine). */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}
