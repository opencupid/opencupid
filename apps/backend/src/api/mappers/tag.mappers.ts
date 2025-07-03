import { TagWithTranslations, TagWithTranslationsSchema } from '@zod/tag/tag.db'
import { PublicTag } from '@zod/tag/tag.dto'

export function DbTagToPublicTagTransform(dbTag: TagWithTranslations, locale: string): PublicTag {
  const translation = dbTag.translations.find(t => t.locale === locale)

  return {
    id: dbTag.id,
    name: translation?.name ?? '',
    slug: dbTag.slug,
  }
}

export function mapProfileTagsTranslated(tags: TagWithTranslations[], locale: string): PublicTag[] {
  return tags.map(tag => DbTagToPublicTagTransform(TagWithTranslationsSchema.parse(tag), locale))
}
