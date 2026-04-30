import { blurhashToDataUrl } from '@/features/images/composables/useBlurhashDataUrl'
import type { IconRenderer } from '@/features/map/types/map.types'
import './profileMarkerIcon.scss'

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

export const renderProfileMarkerHtml: IconRenderer = (props) => {
  const url = props.image?.variants?.find((v) => v.size === 'thumb')?.url
  if (!url) return ''
  const bg = props.image?.blurhash
    ? ` style="background-image:url(${escapeAttr(blurhashToDataUrl(props.image.blurhash))})"`
    : ''
  const cls = props.isHighlighted ? 'poi-avatar highlighted' : 'poi-avatar'
  const indicator = props.hasPost ? '<div class="post-indicator"></div>' : ''
  return `<div class="profile-marker"><img src="${escapeAttr(url)}"${bg} class="w-100 h-100 ${cls}"/>${indicator}</div>`
}
