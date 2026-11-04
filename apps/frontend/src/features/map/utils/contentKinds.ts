import type { UserContentKind } from '@shared/maps'

import IconProfile from '@/assets/icons/interface/user.svg'
import IconPost from '@/assets/icons/interface/post-it.svg'
import IconEvent from '@/assets/icons/interface/calendar.svg'
import IconCommunity from '@/assets/icons/interface/community.svg'

/**
 * How each user-content kind is presented wherever the user picks kinds
 * (map layer chooser, browse grid type pills): icon, label key and the
 * Bootstrap theme color (see `$theme-colors` in css/theme.scss).
 */
export const CONTENT_KIND_DISPLAY = {
  profile: { icon: IconProfile, label: 'map.layer_control.people', color: 'primary' },
  post: { icon: IconPost, label: 'map.layer_control.posts', color: 'post' },
  event: { icon: IconEvent, label: 'map.layer_control.events', color: 'event' },
  community: { icon: IconCommunity, label: 'map.layer_control.communities', color: 'community' },
} as const satisfies Record<
  UserContentKind,
  { icon: typeof IconProfile; label: string; color: string }
>
