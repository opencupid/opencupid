const {
  OG_TITLE,
  OG_DESCRIPTION,
  OG_IMAGE,
  OG_URL,
  OG_TYPE,
} = __APP_CONFIG__

function setMeta(property: string, content: string | undefined) {
  if (!content) return
  let tag = document.querySelector<HTMLMetaElement>(`meta[property='${property}']`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('property', property)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

setMeta('og:title', OG_TITLE)
setMeta('og:description', OG_DESCRIPTION)
setMeta('og:image', OG_IMAGE)
setMeta('og:url', OG_URL)
setMeta('og:type', OG_TYPE)

if (OG_TITLE) {
  document.title = OG_TITLE
}
