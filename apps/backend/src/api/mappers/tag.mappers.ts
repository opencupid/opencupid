import { TagWithTranslations, TagWithTranslationsSchema } from '@zod/tag/tag.db'
import { PublicTag } from '@zod/tag/tag.dto'

export function DbTagToPublicTagTransform(dbTag: TagWithTranslations, locale: string): PublicTag {
  let preferredTranslation: (typeof dbTag.translations)[number] | undefined
  let englishTranslation: (typeof dbTag.translations)[number] | undefined
  let fallbackTranslation: (typeof dbTag.translations)[number] | undefined

  for (const t of dbTag.translations) {
    const trimmedName = t.name.trim()
    if (!trimmedName) continue

    if (t.locale === locale) {
      preferredTranslation = t
      break
    }

    if (t.locale === 'en' && !englishTranslation) {
      englishTranslation = t
    }

    if (!fallbackTranslation) {
      fallbackTranslation = t
    }
  }

  const translation = preferredTranslation ?? englishTranslation ?? fallbackTranslation

  return {
    id: dbTag.id,
    name: translation?.name ?? '',
    slug: dbTag.slug,
  }
}

export function mapProfileTagsTranslated(tags: TagWithTranslations[], locale: string): PublicTag[] {
  return tags.map((tag) => DbTagToPublicTagTransform(TagWithTranslationsSchema.parse(tag), locale))
}
