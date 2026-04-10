import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { MapCluster, MapPoi, BoundsWithZoom } from '@/features/map/types/map.types'
import type { ClusterFeature, PointFeature } from '@shared/zod/map/cluster.dto'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'

/**
 * Composable that manages the posts data layer, bounds-scoped tags,
 * and map selection state for the unified browse map.
 */
export function useBrowseViewModel(
  onProfileBoundsChanged: (b: BoundsWithZoom) => void
) {
  const findProfileStore = useFindProfileStore()
  const { clusterFeatures, postPois, availableTags, isLoadingPosts } =
    storeToRefs(findProfileStore)

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

  // TODO type wrangling - what type are we converting into?
  // this belongs to the pinia store, or better yet, into the backend
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

  // ── Map selection state ────────────────────────────────────────────
  const activePoi = ref<MapPoi | null>(null)

  function onSelectionClear() {
    activePoi.value = null
  }

  // ── Unified bounds handler ─────────────────────────────────────────
  async function onBoundsChanged(boundsWithZoom: BoundsWithZoom) {
    await Promise.all([
      onProfileBoundsChanged(boundsWithZoom),
      findProfileStore.fetchPostsAndTags(boundsWithZoom.bounds),
    ])
  }

  return {
    postPois,
    clusters,
    profilePois,
    allPois,
    availableTags,
    isLoadingPosts,
    activePoi,
    onSelectionClear,
    onBoundsChanged,
  }
}
