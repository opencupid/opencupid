import type { BoundsBox, ListOptions } from './userContent.service'

/** Where-clause shorthand: row is live and visible. */
export const visible = { isDeleted: false, isVisible: true } as const

/** Where-clause shorthand: row is live (visibility unspecified — caller controls). */
export const notDeleted = { isDeleted: false } as const

/** Owner-check where: live row owned by profileId. Used by update/delete owner gates. */
export const ownedBy = (id: string, profileId: string) => ({
  id,
  postedById: profileId,
  isDeleted: false,
})

/** Toggleable visibility predicate — for /me-style endpoints where owners see their hidden items. */
export const visibilityFilter = (includeInvisible: boolean) =>
  includeInvisible ? {} : { isVisible: true }

/** Standard pagination from ListOptions. Defaults match the route layer's expectations. */
export const paginate = (options: ListOptions) => ({
  take: options.limit ?? 20,
  skip: options.offset ?? 0,
})

/**
 * Soft-delete data field. Constructed as a function so `updatedAt` is fresh
 * per call — a constant would freeze the timestamp at module load.
 */
export const softDeleteData = () => ({
  isDeleted: true,
  updatedAt: new Date(),
})

/**
 * Bounding-box where-clause for a point + radius (km). Approximates a great-circle
 * region with a lat/lon rectangle — fast and good enough for "nearby" filtering.
 * 1 degree of latitude is ~111 km; longitude shrinks toward the poles by cos(lat).
 */
export const boundingBoxWhere = (lat: number, lon: number, radiusKm: number) => {
  const latRange = radiusKm / 111.0
  const lonRange = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180))
  return {
    lat: { gte: lat - latRange, lte: lat + latRange },
    lon: { gte: lon - lonRange, lte: lon + lonRange },
  }
}

/** Where-clause for a viewport box. */
export const boundsWhere = (bounds: BoundsBox) => ({
  lat: { gte: bounds.south, lte: bounds.north },
  lon: { gte: bounds.west, lte: bounds.east },
})

/** Cutoff for "recent" — the timestamp `days` days ago. */
export const recentSince = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}
