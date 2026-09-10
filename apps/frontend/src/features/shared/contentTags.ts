import type { PublicTag } from '@zod/tag/tag.dto'

/**
 * Serializes a UserContent item's tags into the space-separated slug string
 * used for the `data-tags` DOM attribute on content cards and full views.
 * Slugs are URL-safe kebab-case, so they need no escaping and are queryable
 * via `[data-tags~="hiking"]`.
 */
export function tagsDataAttr(tags: PublicTag[]): string {
  return tags.map((tag) => tag.slug).join(' ')
}
