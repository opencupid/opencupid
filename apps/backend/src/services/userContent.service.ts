/**
 * Route-facing contract every UserContent service must satisfy.
 *
 * Type parameters:
 *   - TRow            standard list/CRUD row shape (postedBy hydrated, no viewer context)
 *   - TDetailRow      single-item row including viewer-relative conversation context
 *   - TBoundsRow      row used for map-bounds summary projection
 *   - TCreatePayload / TUpdatePayload  validated request bodies
 *
 * Optional capabilities (`findNearby`, `findRecent`, `findInBounds`) let each
 * concrete content type opt out — the route factory only registers the
 * corresponding endpoint when the method is present.
 */
export interface UserContentService<
  TRow,
  TDetailRow,
  TBoundsRow,
  TCreatePayload,
  TUpdatePayload,
> {
  create(profileId: string, data: TCreatePayload): Promise<TRow>
  update(id: string, profileId: string, data: TUpdatePayload): Promise<TRow | null>
  delete(id: string, profileId: string): Promise<{ id: string } | null>

  findByIdWithContext(id: string, viewerProfileId: string): Promise<TDetailRow | null>

  findAll(options: ListOptions): Promise<TRow[]>
  findByProfileId(
    profileId: string,
    options: ListOptions & { includeInvisible?: boolean }
  ): Promise<TRow[]>

  findNearby?(
    lat: number,
    lon: number,
    radius: number,
    options: ListOptions
  ): Promise<TRow[]>
  findRecent?(options: ListOptions): Promise<TRow[]>
  findInBounds?(bounds: BoundsBox): Promise<TBoundsRow[]>
}

export interface ListOptions {
  limit?: number
  offset?: number
  /**
   * Discriminator filter (e.g. PostType for Post; absent for Event).
   * Loosely typed — concrete services interpret/validate.
   */
  type?: string
}

export interface BoundsBox {
  south: number
  north: number
  west: number
  east: number
}
