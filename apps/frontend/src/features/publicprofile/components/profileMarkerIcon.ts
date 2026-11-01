import { blurhashToDataUrl } from '@/features/images/composables/useBlurhashDataUrl'
import type { IconRenderer } from '@/features/map/types/map.types'
import photoHiddenUrl from '@/assets/images/app/photo-hidden.svg?url'
import hideIconSvg from '@/assets/icons/interface/hide.svg?raw'
import './profileMarkerIcon.scss'

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
  const indicator = props.hasPost ? '<div class="post-indicator"></div>' : ''
  return `<div class="profile-marker"><img src="${escapeAttr(url)}"${bg} class="w-100 h-100 ${cls}"/>${indicator}</div>`
}

/**
 * Marker for a profile whose photos the viewer may not see (see useProfilePhotoAccess):
 * the photo's blurhash under a crossed-eye icon, or photo-hidden.svg when the
 * profile has no photo at all.
 */
export const renderHiddenProfileMarkerHtml: IconRenderer = (props) => {
  const cls = props.isHighlighted ? 'poi-avatar highlighted' : 'poi-avatar'
  const indicator = props.hasPost ? '<div class="post-indicator"></div>' : ''
  if (!props.image?.url) {
    return `<div class="profile-marker"><img src="${escapeAttr(photoHiddenUrl)}" class="w-100 h-100 ${cls}"/>${indicator}</div>`
  }
  const bg = props.image.blurhash
    ? ` style="background-image:url(${escapeAttr(blurhashToDataUrl(props.image.blurhash))})"`
    : ''
  return `<div class="profile-marker"><div${bg} class="w-100 h-100 ${cls} poi-avatar-hidden">${hideIconSvg}</div>${indicator}</div>`
}
