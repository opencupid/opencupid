import { computed, watch, type Ref } from 'vue'
import { useRoute, useRouter, type LocationQuery } from 'vue-router'
import type { PublicTag } from '@zod/tag/tag.dto'
import type { MapBounds } from '@/features/map/types/map.types'
import { GRID_ROUTE } from '@/features/shared/composables/useDetailRouteState'
import { useTagsStore } from '@/store/tagStore'

const BBOX_DECIMALS = 4
/** How long a requested map fit may take before the URL follows the map again. */
const PENDING_FIT_MS = 5000

export function formatBbox(b: MapBounds): string {
  return [b.west, b.south, b.east, b.north].map((n) => n.toFixed(BBOX_DECIMALS)).join(',')
}

export function parseBbox(raw: unknown): MapBounds | null {
  if (typeof raw !== 'string') return null
  const parts = raw.split(',').map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null
  const [west, south, east, north] = parts as [number, number, number, number]
  if (south >= north || west >= east) return null
  return { west, south, east, north }
}

function parseTagIds(raw: unknown): string[] {
  if (typeof raw !== 'string') return []
  return [
    ...new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ]
}

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',')

/** True when `actual`'s centre is close to `requested`'s, relative to its size. */
function fitReached(actual: MapBounds, requested: MapBounds): boolean {
  const latSpan = requested.north - requested.south
  const lonSpan = requested.east - requested.west
  const dLat = Math.abs((actual.north + actual.south) / 2 - (requested.north + requested.south) / 2)
  const dLon = Math.abs((actual.east + actual.west) / 2 - (requested.east + requested.west) / 2)
  return dLat <= latSpan * 0.2 && dLon <= lonSpan * 0.2
}

/**
 * Keeps the browse grid's URL (`/browse/grid?tags=…&bbox=w,s,e,n`) in step
 * with the map area and the tag filter, so a grid link can be shared or
 * reloaded:
 * - while on the grid route, map moves and tag changes replace the query;
 * - a query that differs from the current state (deep link, back/forward)
 *   restores the tags and fits the map to the bbox.
 */
export function useGridUrlSync(opts: {
  bounds: Ref<MapBounds | null>
  selectedTags: Ref<PublicTag[]>
  setTags: (tags: PublicTag[]) => void
  fitBounds: (bounds: MapBounds) => void
}) {
  const route = useRoute()
  const router = useRouter()
  const tagsStore = useTagsStore()

  const isGridRoute = computed(() => route.name === GRID_ROUTE)
  const selectedTagIds = computed(() => opts.selectedTags.value.map((t) => t.id))

  // While a fit or a tag lookup from the URL is in flight, the URL is the
  // source of truth: don't overwrite it with the state it is about to replace.
  let pendingFit: { bounds: MapBounds; until: number } | null = null
  let pendingTagIds: string[] | null = null
  // The query this composable last wrote. Route updates that merely echo it
  // are not new input; treating them as such would revert a tag change made
  // while that navigation was still settling.
  let lastWritten: { tags: unknown; bbox: unknown } | null = null

  // ── URL → state ──────────────────────────────────────────────────
  watch(
    () => [isGridRoute.value, route.query.tags, route.query.bbox] as const,
    async ([onGrid, rawTags, rawBbox]) => {
      if (!onGrid) return
      if (lastWritten && rawTags === lastWritten.tags && rawBbox === lastWritten.bbox) return

      const bbox = parseBbox(rawBbox)
      const current = opts.bounds.value
      if (bbox && (!current || formatBbox(current) !== formatBbox(bbox))) {
        pendingFit = { bounds: bbox, until: Date.now() + PENDING_FIT_MS }
        opts.fitBounds(bbox)
      }

      const ids = parseTagIds(rawTags)
      if (!sameIds(ids, selectedTagIds.value)) {
        if (ids.length === 0) {
          opts.setTags([])
          return
        }
        pendingTagIds = ids
        const res = await tagsStore.fetchByIds(ids)
        // A newer URL may have superseded this lookup.
        if (pendingTagIds !== ids) return
        pendingTagIds = null
        if (res.success) opts.setTags(res.data?.result ?? [])
      }
    },
    { immediate: true }
  )

  // ── state → URL ──────────────────────────────────────────────────
  function desiredQuery(bounds: MapBounds | null): LocationQuery {
    const query: LocationQuery = { ...route.query }
    const tagIds = pendingTagIds ?? selectedTagIds.value
    if (tagIds.length > 0) query.tags = tagIds.join(',')
    else delete query.tags
    const bboxSource = pendingFit ? pendingFit.bounds : bounds
    if (bboxSource) query.bbox = formatBbox(bboxSource)
    return query
  }

  watch(
    () => [isGridRoute.value, opts.bounds.value, selectedTagIds.value] as const,
    ([onGrid, bounds]) => {
      if (!onGrid) return
      if (
        pendingFit &&
        bounds &&
        (fitReached(bounds, pendingFit.bounds) || Date.now() > pendingFit.until)
      ) {
        pendingFit = null
      }
      const query = desiredQuery(bounds)
      if (query.tags === route.query.tags && query.bbox === route.query.bbox) return
      lastWritten = { tags: query.tags, bbox: query.bbox }
      router.replace({ name: GRID_ROUTE, query })
    },
    { immediate: true }
  )
}
