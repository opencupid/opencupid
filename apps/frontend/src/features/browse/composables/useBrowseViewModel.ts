import { computed, ref, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { api, safeApiCall } from '@/lib/api'
import type { BrowseBoundsResponse } from '@zod/apiResponse.dto'
import type { PublicTag } from '@zod/tag/tag.dto'
import type {
  MapBounds,
  MapCluster,
  MapPoi,
  BoundsWithZoom,
} from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'
import type { PublicPostWithProfile } from '@zod/post/post.dto'
import type { ClusterFeature, MapFeature, PointFeature } from '@shared/zod/map/cluster.dto'
import { useBrowseFiltersStore } from '@/features/browse/stores/browseFiltersStore'

/**
 * Composable that manages the posts data layer, bounds-scoped tags,
 * and map selection state for the unified browse map. Profile clustering
 * continues to be managed by `useProfilesViewModel` / `findProfileStore`.
 * The ephemeral tag selection lives in `useBrowseFiltersStore`.
 */
export function useBrowseViewModel(
  clusterFeatures: Ref<MapFeature[]>,
  onProfileBoundsChanged: (b: BoundsWithZoom) => void
) {
  const filtersStore = useBrowseFiltersStore()
  const { selectedTagIds } = storeToRefs(filtersStore)

  const postPois = ref<MapPoi[]>([])
  const availableTags = ref<PublicTag[]>([])
  const isLoadingPosts = ref(false)
  let postAbortController: AbortController | null = null

  async function fetchPostsAndTags(bounds: MapBounds) {
    if (postAbortController) postAbortController.abort()
    const controller = new AbortController()
    postAbortController = controller

    isLoadingPosts.value = true
    try {
      const res = await safeApiCall(() =>
        api.get<BrowseBoundsResponse>('/browse/bounds', {
          params: bounds,
          signal: controller.signal,
        })
      )

      if (!res.data.success) return

      // Map posts to MapPoi[]
      postPois.value = (res.data.posts as PublicPostWithProfile[])
        .filter((p) => p.location?.lat != null && p.location?.lon != null)
        .map((p) => ({
          id: p.id,
          title: p.content?.substring(0, 50) ?? '',
          location: { lat: p.location!.lat!, lon: p.location!.lon! },
          image: p.postedBy?.profileImages?.[0],
          type: 'post',
          source: p,
        }))

      // Update available tags for the filter pill
      availableTags.value = res.data.tags
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return
      // On transient errors, keep the last good postPois/availableTags on
      // screen rather than flashing to empty — the user just panned and a
      // blank map is worse UX than slightly-stale results.
    } finally {
      if (postAbortController === controller) {
        isLoadingPosts.value = false
      }
    }
  }

  const clusters = computed<MapCluster[]>(() =>
    clusterFeatures.value
      .filter((f): f is ClusterFeature => f.type === 'cluster')
      .map((f) => ({
        id: f.id,
        location: { lat: f.lat, lon: f.lon },
        count: f.count,
        expansionZoom: f.expansionZoom,
      }))
  )

  const profilePois = computed<MapPoi[]>(() =>
    clusterFeatures.value
      .filter((f): f is PointFeature => f.type === 'point')
      .map((p) => ({
        id: p.id,
        title: p.publicName,
        location: { lat: p.lat, lon: p.lon },
        image: p.image?.url
          ? { blurhash: p.image.blurhash, variants: [{ size: 'thumb', url: p.image.url }] }
          : undefined,
        highlighted: p.highlighted,
        type: 'profile',
        source: p,
      }))
  )

  const allPois = computed<MapPoi[]>(() => [...profilePois.value, ...postPois.value])

  // Tag selection actions are delegated to useBrowseFiltersStore — see
  // filtersStore.toggleTag / clearTags. Exposed here only for caller
  // convenience so the filter bar doesn't need to import the store
  // directly.
  const toggleTag = (id: string) => filtersStore.toggleTag(id)
  const clearTags = () => filtersStore.clearTags()

  // ── Map selection state ────────────────────────────────────────────
  const activePoi = ref<MapPoi | null>(null)

  function onSelectionClear() {
    activePoi.value = null
  }

  // ── Unified bounds handler ─────────────────────────────────────────
  async function onBoundsChanged(boundsWithZoom: BoundsWithZoom) {
    await Promise.all([
      onProfileBoundsChanged(boundsWithZoom),
      fetchPostsAndTags(boundsWithZoom.bounds),
    ])
  }

  return {
    postPois,
    clusters,
    profilePois,
    allPois,
    availableTags,
    selectedTagIds,
    isLoadingPosts,
    fetchPostsAndTags,
    toggleTag,
    clearTags,
    activePoi,
    onSelectionClear,
    onBoundsChanged,
  }
}
