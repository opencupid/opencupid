import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { MapCluster, MapPoi, BoundsWithZoom } from '@/features/map/types/map.types'
import type { ClusterFeature, PointFeature } from '@shared/zod/map/cluster.dto'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

/**
 * View-model for the browse map. Reads cluster data from findProfileStore,
 * maps DTOs to map-layer types, and provides unified bounds handling and
 * selection state. Both profile and post POIs derive from the cluster
 * features — a single data source for the entire map.
 */
export function useBrowseViewModel() {
  const findProfileStore = useFindProfileStore()
  const ownerStore = useOwnerProfileStore()
  const { clusterFeatures, availableTags, isLoading } = storeToRefs(findProfileStore)

  const viewerProfile = computed(() => ownerStore.profile)

  // ── DTO → map-layer mapping ─────────────────────────────────────
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
      .filter((f): f is PointFeature => f.type === 'point' && f.kind === 'profile')
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

  const postPois = computed<MapPoi[]>(() =>
    clusterFeatures.value
      .filter((f): f is PointFeature => f.type === 'point' && f.kind === 'post')
      .map((p) => ({
        id: p.id,
        title: p.postContent ?? '',
        location: { lat: p.lat, lon: p.lon },
        image: p.image?.url
          ? { blurhash: p.image.blurhash, variants: [{ size: 'thumb', url: p.image.url }] }
          : undefined,
        type: 'post',
        source: p,
      }))
  )

  const allPois = computed<MapPoi[]>(() => [...profilePois.value, ...postPois.value])

  const haveResults = computed(() => clusterFeatures.value.length > 0)

  const isNoOneAround = computed(() => {
    const features = clusterFeatures.value
    if (features.length === 0) return false
    const first = features[0]
    return (
      features.length === 1 &&
      first?.type === 'point' &&
      first.kind === 'profile' &&
      first.id === viewerProfile.value?.id
    )
  })

  // ── Map selection state ────────────────────────────────────────────
  const activePoi = ref<MapPoi | null>(null)

  function onSelectionClear() {
    activePoi.value = null
  }

  // ── Bounds handler ─────────────────────────────────────────────────
  async function onBoundsChanged({ bounds, zoom }: BoundsWithZoom) {
    await findProfileStore.fetchBounds(bounds, zoom)
  }

  const fetchPopupData = (id: string | number) => findProfileStore.fetchProfileForPopup(String(id))

  return {
    viewerProfile,
    clusters,
    profilePois,
    postPois,
    allPois,
    availableTags,
    isLoading,
    haveResults,
    isNoOneAround,
    activePoi,
    onSelectionClear,
    onBoundsChanged,
    fetchPopupData,
  }
}
