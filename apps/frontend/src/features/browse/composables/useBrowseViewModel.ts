import { computed, markRaw, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { MapCluster, MapPoi, BoundsWithZoom } from '@/features/map/types/map.types'
import type { ClusterFeature, PointFeature } from '@shared/zod/map/cluster.dto'
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
  // Memoise output objects by id. Per-session contract: POI data is
  // treated as immutable for the lifetime of an id — first sighting
  // wins, later batches with the same id return the cached reference
  // unchanged. The GUI is not expected to reflect mid-session DB changes,
  // so no equivalence check is needed. Clusters DO change between batches
  // (count rebalances, centroid shifts on filter changes) and use a
  // structural equivalence check below. Every entry is markRaw'd to skip
  // Vue's deep-proxy traversal — consumers only read scalar fields.
  const clusterCache = new Map<number, MapCluster>()
  const profileCache = new Map<string, MapPoi>()
  const postCache = new Map<string, MapPoi>()

  function memoCluster(f: ClusterFeature): MapCluster {
    const prev = clusterCache.get(f.id)
    if (
      prev &&
      prev.location.lat === f.lat &&
      prev.location.lon === f.lon &&
      prev.count === f.count &&
      prev.expansionZoom === f.expansionZoom
    ) {
      return prev
    }
    const next = markRaw<MapCluster>({
      id: f.id,
      location: { lat: f.lat, lon: f.lon },
      count: f.count,
      expansionZoom: f.expansionZoom,
    })
    clusterCache.set(f.id, next)
    return next
  }

  function memoProfilePoi(p: PointFeature): MapPoi {
    const cached = profileCache.get(p.id)
    if (cached) return cached
    const url = p.image?.url
    const next = markRaw<MapPoi>({
      id: p.id,
      title: p.publicName,
      location: { lat: p.lat, lon: p.lon },
      image: url ? { blurhash: p.image!.blurhash, variants: [{ size: 'thumb', url }] } : undefined,
      highlighted: p.highlighted,
      hasPost: p.hasPost,
      type: 'profile',
      source: p,
    })
    profileCache.set(p.id, next)
    return next
  }

  function memoPostPoi(p: PointFeature): MapPoi {
    const cached = postCache.get(p.id)
    if (cached) return cached
    const url = p.image?.url
    const next = markRaw<MapPoi>({
      id: p.id,
      title: p.postContent ?? '',
      location: { lat: p.lat, lon: p.lon },
      image: url ? { blurhash: p.image!.blurhash, variants: [{ size: 'thumb', url }] } : undefined,
      type: 'post',
      source: p,
    })
    postCache.set(p.id, next)
    return next
  }

  const clusters = computed<MapCluster[]>(() => {
    const live = new Set<number>()
    const out: MapCluster[] = []
    for (const f of clusterFeatures.value) {
      if (f.type !== 'cluster') continue
      live.add(f.id)
      out.push(memoCluster(f as ClusterFeature))
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
      out.push(memoProfilePoi(f as PointFeature))
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
      out.push(memoPostPoi(f as PointFeature))
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
    if (poi?.type === 'post') return Promise.resolve(null)
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
