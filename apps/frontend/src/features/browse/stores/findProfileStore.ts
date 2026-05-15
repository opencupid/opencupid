import { defineStore } from 'pinia'
import { CanceledError } from 'axios'
import { api, safeApiCall } from '@/lib/api'
import type { PublicProfile } from '@zod/profile/profile.dto'
import type { GetPublicProfileResponse } from '@zod/apiResponse.dto'
import type { PublicTag } from '@zod/tag/tag.dto'
import { BoundsMapResponseSchema, type PointFeature } from '@shared/zod/map/map.dto'
import { storeSuccess, storeError, type StoreVoidSuccess, type StoreError } from '@/store/helpers'
import { bus } from '@/lib/bus'
import { useSearchStore } from './searchStore'
import { USER_CONTENT_KINDS, type UserContentKind } from '@shared/maps'
import type { MapBounds } from '@/features/map/types/map.types'
import { boundsContain, padBounds } from '../utils/boundsUtils'

let boundsAbortController: AbortController | null = null
let cachedBounds: MapBounds | null = null
let cachedTagSig = ''
let cachedKindsSig = ''
const popupCache = new Map<string, PublicProfile>()
const POPUP_CACHE_MAX = 20

/**
 * Stable signature for a tag selection, used for cache keying. Sorting
 * guarantees that the same set always produces the same string regardless
 * of selection order.
 */
function tagSignature(tagIds: string[]): string {
  if (tagIds.length === 0) return ''
  return [...tagIds].sort().join(',')
}

/**
 * Serializes the tag selection for HTTP transport. Returns `undefined` when
 * empty so axios omits the `tagIds` query param entirely (keeps URLs clean
 * in dev tools and matches the backend's "empty string means no filter"
 * parser).
 */
function tagIdsParam(tagIds: string[]): string | undefined {
  return tagIds.length > 0 ? tagIds.join(',') : undefined
}

function kindsSignature(kinds: UserContentKind[]): string {
  return [...kinds].sort().join(',')
}

function kindsParam(kinds: UserContentKind[]): string {
  // Schema requires non-empty; always emit so dev-tools URLs are explicit.
  return kinds.join(',')
}

function sameBounds(a: MapBounds | null, b: MapBounds): boolean {
  return (
    a !== null &&
    a.south === b.south &&
    a.north === b.north &&
    a.west === b.west &&
    a.east === b.east
  )
}

function invalidateBoundsCache(): void {
  cachedBounds = null
  cachedTagSig = ''
  cachedKindsSig = ''
  popupCache.clear()
}

type FindProfileStoreState = {
  poiFeatures: PointFeature[]
  lastMapBounds: MapBounds | null
  isLoading: boolean
  availableTags: PublicTag[]
  /**
   * Which user-content layers are visible on the map. Sent verbatim to the
   * backend as the `kinds` query param on bounds fetches; toggling
   * invalidates the bounds cache and triggers a refetch. The non-empty
   * invariant required by the wire schema is enforced upstream by
   * MapLayerControl, which disables the last-remaining checkbox.
   */
  selectedLayers: UserContentKind[]
}

export const useFindProfileStore = defineStore('findProfile', {
  state: (): FindProfileStoreState => ({
    poiFeatures: [] as PointFeature[],
    lastMapBounds: null,
    isLoading: false,
    availableTags: [] as PublicTag[],
    selectedLayers: [...USER_CONTENT_KINDS],
  }),

  actions: {
    async findPoisForMapBounds(bounds: MapBounds): Promise<StoreVoidSuccess | StoreError> {
      if (boundsAbortController) {
        boundsAbortController.abort()
      }
      const controller = new AbortController()
      boundsAbortController = controller
      this.lastMapBounds = bounds

      const tagIds = useSearchStore().selectedTagIds
      const sig = tagSignature(tagIds)
      const kinds = this.selectedLayers
      const kindsSig = kindsSignature(kinds)

      const sameTags = sig === cachedTagSig
      const sameKinds = kindsSig === cachedKindsSig
      if (sameTags && sameKinds && cachedBounds && boundsContain(cachedBounds, bounds)) {
        this.isLoading = false
        return storeSuccess()
      }

      try {
        this.isLoading = true

        const paddedBounds = padBounds(bounds, 0.3)
        const res = await safeApiCall(() =>
          api.get('/find/bounds', {
            params: {
              ...paddedBounds,
              tagIds: tagIdsParam(tagIds),
              kinds: kindsParam(kinds),
            },
            signal: controller.signal,
          })
        )

        const parsed = BoundsMapResponseSchema.parse(res.data)
        this.poiFeatures = parsed.features
        this.availableTags = parsed.tags
        cachedBounds = paddedBounds
        cachedTagSig = sig
        cachedKindsSig = kindsSig

        return storeSuccess()
      } catch (error: any) {
        if (error instanceof CanceledError) {
          return storeSuccess()
        }
        this.poiFeatures = []
        return storeError(error, 'Failed to fetch map POIs')
      } finally {
        if (boundsAbortController === controller) {
          this.isLoading = false
        }
      }
    },

    /**
     * Unified bounds handler — deduplicates viewport, then fetches POIs
     * (including content and tags) in a single request. The zoom is no
     * longer relevant to the request: the backend returns every visible
     * POI regardless of zoom, and the frontend applies density-based
     * spreading at render time.
     */
    async fetchBounds(bounds: MapBounds, _zoom: number): Promise<void> {
      if (sameBounds(this.lastMapBounds, bounds)) return
      await this.findPoisForMapBounds(bounds)
    },

    async fetchProfileForPopup(
      profileId: string,
      signal?: AbortSignal
    ): Promise<PublicProfile | null> {
      const cached = popupCache.get(profileId)
      if (cached) {
        // LRU touch — re-insert moves the key to the end of insertion order.
        popupCache.delete(profileId)
        popupCache.set(profileId, cached)
        return cached
      }

      try {
        const res = await safeApiCall(() =>
          api.get<GetPublicProfileResponse>(`/profiles/${profileId}`, { signal })
        )
        const profile = res.data.profile
        if (popupCache.size >= POPUP_CACHE_MAX) {
          // Map iteration is insertion-ordered; combined with the touch above
          // this evicts the least-recently-used entry.
          const firstKey = popupCache.keys().next().value!
          popupCache.delete(firstKey)
        }
        popupCache.set(profileId, profile)
        return profile
      } catch {
        return null
      }
    },

    async refetchBounds(): Promise<void> {
      invalidateBoundsCache()
      if (this.lastMapBounds) {
        await this.findPoisForMapBounds(this.lastMapBounds)
      }
    },

    teardown() {
      if (boundsAbortController) {
        boundsAbortController.abort()
        boundsAbortController = null
      }
      invalidateBoundsCache()
      this.poiFeatures = []
      this.lastMapBounds = null
      this.isLoading = false
      this.availableTags = []
      this.selectedLayers = [...USER_CONTENT_KINDS]
    },
  },
})

bus.on('auth:logout', () => {
  useFindProfileStore().teardown()
})

bus.on('profile:dating-prefs-updated', () => {
  useFindProfileStore().refetchBounds()
})

bus.on('profile:blocked', () => {
  useFindProfileStore().refetchBounds()
})

bus.on('usercontent:mutated', () => {
  useFindProfileStore().refetchBounds()
})
