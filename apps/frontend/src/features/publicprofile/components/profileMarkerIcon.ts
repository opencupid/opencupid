import { blurhashToDataUrl } from '@/features/images/composables/useBlurhashDataUrl'
import type { IconRenderer } from '@/features/map/types/map.types'
import photoHiddenUrl from '@/assets/images/app/photo-hidden.svg?url'
import heartSvg from '@/assets/icons/interface/heart.svg?raw'
import './profileMarkerIcon.scss'

/** Post-it and dating-match badges shared by both profile marker renderers. */
function indicators(props: Parameters<IconRenderer>[0]): string {
  const post = props.hasPost ? '<div class="post-indicator"></div>' : ''
  const match = props.isHighlighted ? `<div class="match-indicator">${heartSvg}</div>` : ''
  return post + match
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

export const renderProfileMarkerHtml: IconRenderer = (props) => {
  const url = props.image?.url
  if (!url) return ''
  const bg = props.image?.blurhash
    ? ` style="background-image:url(${escapeAttr(blurhashToDataUrl(props.image.blurhash))})"`
    : ''
  const cls = props.isHighlighted ? 'poi-avatar highlighted' : 'poi-avatar'
  const indicator = indicators(props)
  return `<div class="profile-marker"><img src="${escapeAttr(url)}"${bg} class="w-100 h-100 ${cls}"/>${indicator}</div>`
}

/**
 * Marker for a profile whose photos the viewer may not see (see useProfilePhotoAccess):
 * the photo's blurhash, or photo-hidden.svg when the profile has no photo at all.
 */
export const renderHiddenProfileMarkerHtml: IconRenderer = (props) => {
  const cls = props.isHighlighted ? 'poi-avatar highlighted' : 'poi-avatar'
  const indicator = indicators(props)
  if (!props.image?.url) {
    return `<div class="profile-marker"><img src="${escapeAttr(photoHiddenUrl)}" class="w-100 h-100 ${cls}"/>${indicator}</div>`
  }
  const avatar = props.image.blurhash
    ? `<img src="${escapeAttr(blurhashToDataUrl(props.image.blurhash))}" class="w-100 h-100 ${cls} poi-avatar-hidden"/>`
    : `<div class="w-100 h-100 ${cls} poi-avatar-hidden"></div>`
  return `<div class="profile-marker">${avatar}${indicator}</div>`
}
