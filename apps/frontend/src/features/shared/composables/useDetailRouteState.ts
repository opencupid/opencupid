import { computed } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'

export type DetailType = 'profile' | 'post' | 'event' | 'community'

/**
 * Route names and params for each detail type. Every detail exists twice:
 * over the map (`/profile/:id`) and over the browse grid
 * (`/browse/grid/profile/:id`), so closing the drawer returns to where the
 * user came from.
 */
export const DETAIL_ROUTES: Record<DetailType, { map: string; grid: string; param: string }> = {
  profile: { map: 'PublicProfile', grid: 'GridProfile', param: 'profileId' },
  post: { map: 'PublicPost', grid: 'GridPost', param: 'postId' },
  event: { map: 'PublicEvent', grid: 'GridEvent', param: 'eventId' },
  community: { map: 'PublicCommunity', grid: 'GridCommunity', param: 'communityId' },
}

export const GRID_ROUTE = 'BrowseGrid'

const byRouteName = new Map<string, { type: DetailType; param: string; grid: boolean }>()
for (const [type, r] of Object.entries(DETAIL_ROUTES) as [
  DetailType,
  (typeof DETAIL_ROUTES)[DetailType],
][]) {
  byRouteName.set(r.map, { type, param: r.param, grid: false })
  byRouteName.set(r.grid, { type, param: r.param, grid: true })
}

/** Route to a detail, over the grid or over the map. */
export function detailRoute(type: DetailType, id: string, overGrid: boolean): RouteLocationRaw {
  const r = DETAIL_ROUTES[type]
  return { name: overGrid ? r.grid : r.map, params: { [r.param]: id } }
}

export function useDetailRouteState() {
  const route = useRoute()

  const match = computed(() => byRouteName.get(route.name as string) ?? null)

  const detail = computed(() => {
    const m = match.value
    return m ? { type: m.type, id: route.params[m.param] as string } : null
  })

  /** True on the grid route and on any detail opened from the grid. */
  const isGridOpen = computed(() => route.name === GRID_ROUTE || match.value?.grid === true)

  return { detail, isGridOpen }
}
