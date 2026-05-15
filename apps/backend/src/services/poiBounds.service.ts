import { ProfileMatchService } from './profileMatch.service'
import { UserContentService } from './userContent.service'
import { ImageService } from './image.service'
import type { PointFeature } from '@shared/zod/map/map.dto'
import type { TagWithTranslations } from '@shared/zod/tag/tag.db'
import type { UserContentKind } from '@shared/maps'
import type { ContentKind } from '@shared/zod/userContent/userContent.dto'

/**
 * Bounds-driven POI lookup.
 *
 * Replaces the previous supercluster pipeline: no in-memory index, no
 * cache invalidation, no `expansionZoom`. The frontend asks for every POI
 * visible in the current viewport and renders them directly with
 * density-based spreading applied at draw time. Database access is read
 * straight from the same matcher methods that powered the cluster index;
 * the bbox is applied in app code (the existing queries already cap the
 * row count, so the filter operates on small sets).
 */
export class PoiBoundsService {
  private static instance: PoiBoundsService

  private constructor() {}

  static getInstance(): PoiBoundsService {
    if (!PoiBoundsService.instance) {
      PoiBoundsService.instance = new PoiBoundsService()
    }
    return PoiBoundsService.instance
  }

  /**
   * Returns every visible POI inside `bbox` for the given viewer, plus the
   * deduped set of tags carried by the matching profiles (used to populate
   * the filter UI). Posts whose location matches their author's profile are
   * absorbed into the profile feature via `hasPost: true` to avoid stacking
   * two markers on the same coordinate.
   *
   * @param bbox `[west, south, east, north]` — the order Leaflet's
   * `latLngBounds` and the legacy supercluster API both used; preserved so
   * call sites don't need to learn a new convention.
   */
  async getPois(
    profileId: string,
    bbox: [number, number, number, number],
    tagIds: string[],
    kinds: UserContentKind[]
  ): Promise<{ features: PointFeature[]; tags: TagWithTranslations[] }> {
    const [west, south, east, north] = bbox
    const inBounds = (lat: number | null, lon: number | null): boolean =>
      lat != null && lon != null && lat >= south && lat <= north && lon >= west && lon <= east

    const profileMatchService = ProfileMatchService.getInstance()
    const userContentService = UserContentService.getInstance()
    const imageService = ImageService.getInstance()

    const wantProfiles = kinds.includes('profile')
    const contentKinds = kinds.filter((k): k is ContentKind => k !== 'profile')
    const wantContent = contentKinds.length > 0

    const [profiles, matchIds, contentRows] = await Promise.all([
      wantProfiles
        ? profileMatchService.findSocialProfilesWithLocation(profileId, tagIds)
        : Promise.resolve(
            [] as Awaited<ReturnType<typeof profileMatchService.findSocialProfilesWithLocation>>
          ),
      wantProfiles
        ? profileMatchService.findMutualMatchIds(profileId)
        : Promise.resolve([] as string[]),
      wantContent
        ? userContentService.findAllWithLocation(profileId, contentKinds)
        : Promise.resolve([] as Awaited<ReturnType<typeof userContentService.findAllWithLocation>>),
    ])

    const matchSet = new Set(matchIds)

    // Tags are derived from every matching profile, regardless of bbox —
    // the filter UI shows every tag the viewer could narrow by, not just
    // the ones currently visible.
    const tagMap = new Map<string, TagWithTranslations>()
    for (const profile of profiles) {
      for (const tag of profile.tags ?? []) {
        if (!tagMap.has(tag.id)) tagMap.set(tag.id, tag as TagWithTranslations)
      }
    }

    const profileFeatures: PointFeature[] = []
    const profileIndexById = new Map<string, number>()

    for (const p of profiles) {
      if (!inBounds(p.lat, p.lon)) continue
      const image = p.profileImages?.[0]
        ? {
            blurhash: p.profileImages[0].blurhash ?? null,
            url: imageService.getImageUrls(p.profileImages[0]).find((v) => v.size === 'thumb')?.url,
          }
        : null
      const feature: PointFeature = {
        type: 'point',
        kind: 'profile',
        id: p.id,
        lat: p.lat!,
        lon: p.lon!,
        publicName: p.publicName ?? '',
        image,
        highlighted: matchSet.has(p.id),
      }
      profileIndexById.set(p.id, profileFeatures.length)
      profileFeatures.push(feature)
    }

    const contentFeatures: PointFeature[] = []
    for (const c of contentRows) {
      if (!inBounds(c.lat, c.lon)) continue

      // For posts only: absorb into the author's profile pin when they sit
      // on the same coordinate. Avoids stacking two markers that the
      // density spreader would later have to split apart.
      if (c.kind === 'post') {
        const idx = profileIndexById.get(c.postedById)
        if (idx !== undefined && c.postedBy?.lat === c.lat && c.postedBy?.lon === c.lon) {
          profileFeatures[idx].hasPost = true
          continue
        }
      }

      const image = c.postedBy?.profileImages?.[0]
        ? {
            blurhash: c.postedBy.profileImages[0].blurhash ?? null,
            url: imageService
              .getImageUrls(c.postedBy.profileImages[0])
              .find((v) => v.size === 'thumb')?.url,
          }
        : null
      contentFeatures.push({
        type: 'point',
        kind: c.kind,
        id: c.id,
        lat: c.lat!,
        lon: c.lon!,
        publicName: c.postedBy?.publicName ?? '',
        image,
        highlighted: false,
        ...(c.content ? { postContent: c.content.substring(0, 50) } : {}),
      })
    }

    return {
      features: [...profileFeatures, ...contentFeatures],
      tags: Array.from(tagMap.values()),
    }
  }
}
