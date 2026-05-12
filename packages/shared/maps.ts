/** Maximum zoom level used by the map and the supercluster index. */
export const MAP_MAX_ZOOM = 12

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
