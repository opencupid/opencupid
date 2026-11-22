import type { BrowseListItem } from '@zod/browse/browseList.dto'
import { toGeoPoint, type GeoPoint } from '@zod/dto/location.dto'
import type { DetailType } from '@/features/shared/composables/useDetailRouteState'

/** The id, detail type and map position behind a browse grid item. */
export function browseItemTarget(item: BrowseListItem): {
  type: DetailType
  id: string
  point: GeoPoint | null
} {
  const entity =
    item.kind === 'profile'
      ? item.profile
      : item.kind === 'post'
        ? item.post
        : item.kind === 'event'
          ? item.event
          : item.community
  return { type: item.kind, id: entity.id, point: toGeoPoint(entity.location) }
}
