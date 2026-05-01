import { computed, markRaw, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { MapCluster, MapPoi, BoundsWithZoom } from '@/features/map/types/map.types'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { usePostStore } from '@/features/posts/stores/postStore'

/**
 * View-model for the browse map. Map POIs (profile + post markers, clusters)
 * derive from findProfileStore cluster features. A single bounds event
 * triggers parallel fetches: cluster features for map markers, and
 * postStore.postSummaries for the NearbyFeatures strip (which BrowseProfiles
 * consumes directly from the store, not via this view-model).
 */
export function useBrowseViewModel() {
  const findProfileStore = useFindProfileStore()
  const ownerStore = useOwnerProfileStore()
  const postStore = usePostStore()
  const { clusterFeatures, availableTags, isLoading } = storeToRefs(findProfileStore)

  const viewerProfile = computed(() => ownerStore.profile)

  // ── DTO → map-layer mapping ─────────────────────────────────────
  // The map layer renders cluster-service DTOs directly: MapPoi is
  // PointFeature, MapCluster is ClusterFeature. No projection.
  //
  // Memoise output objects by id. Per-session contract: map data —
  // POIs and clusters alike — is treated as immutable for the lifetime
  // of an id. First sighting wins; later batches with the same id
  // return the cached reference unchanged. Clusters satisfy this by
  // construction: cluster_id is supercluster's per-index identifier,
  // and the supercluster index is keyed in the backend by (profile,
  // tagIds), so within a session the (id → fields) mapping is a
  // function — different filters produce entirely different ids, not
  // same ids with different counts. Every entry is markRaw'd to skip
  // Vue's deep-proxy traversal.
  const clusterCache = new Map<number, MapCluster>()
  const profileCache = new Map<string, MapPoi>()
  const postCache = new Map<string, MapPoi>()

  function memoBy<K, V extends object>(cache: Map<K, V>, key: K, value: V): V {
    const cached = cache.get(key)
    if (cached) return cached
    const next = markRaw(value)
    cache.set(key, next)
    return next
  }

  const clusters = computed<MapCluster[]>(() => {
    const live = new Set<number>()
    const out: MapCluster[] = []
    for (const f of clusterFeatures.value) {
      if (f.type !== 'cluster') continue
      live.add(f.id)
      out.push(memoBy(clusterCache, f.id, f))
    }
    for (const id of clusterCache.keys()) if (!live.has(id)) clusterCache.delete(id)
    return out
  })

  const profilePois = computed<MapPoi[]>(() => {
    const live = new Set<string>()
    const out: MapPoi[] = []
    for (const f of clusterFeatures.value) {
      if (f.type !== 'point' || f.kind !== 'profile') continue
      live.add(f.id)
      out.push(memoBy(profileCache, f.id, f))
    }
    for (const id of profileCache.keys()) if (!live.has(id)) profileCache.delete(id)
    return out
  })

  const postPois = computed<MapPoi[]>(() => {
    const live = new Set<string>()
    const out: MapPoi[] = []
    for (const f of clusterFeatures.value) {
      if (f.type !== 'point' || f.kind !== 'post') continue
      live.add(f.id)
      out.push(memoBy(postCache, f.id, f))
    }
    for (const id of postCache.keys()) if (!live.has(id)) postCache.delete(id)
    return out
  })

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
    await Promise.all([
      findProfileStore.fetchBounds(bounds, zoom),
      postStore.fetchPostsInBounds(bounds),
    ])
  }

  const fetchPopupData = (id: string, signal?: AbortSignal) => {
    const poi = allPois.value.find((p) => p.id === id)
    if (poi?.kind === 'post') return Promise.resolve(null)
    return findProfileStore.fetchProfileForPopup(id, signal)
  }

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
