import z from "zod"

import { ProfileTag, ProfileTagSchema, type Tag } from "@zod/generated"
import { TagWithTranslations, TagWithTranslationsSchema } from "@zod/tag/tag.db"
import { PublicTag } from "@zod/tag/tag.dto"



export const ProfileTagToTagTransformSchema = ProfileTagSchema
  .merge(z.object({ tag: TagWithTranslationsSchema }))
  .transform(join => join.tag)


export const ProfileTagJoinSchema = ProfileTagSchema.merge(
  z.object({ tag: TagWithTranslationsSchema })
)

export type ProfileTagJoin = z.infer<typeof ProfileTagJoinSchema>

export function DbTagToPublicTagTransform(dbTag: TagWithTranslations, locale: string): PublicTag {
  const translation =
    dbTag.translations.find(t => t.locale === locale)

  return {
    id: dbTag.id,
    name: translation?.name ?? '',
    slug: dbTag.slug,
  }
}


// export function mapProfileTags(profileTags: ProfileTag[]): PublicTag[] {
//   return profileTags
//     .map((pt: ProfileTag) => ProfileTagToTagTransformSchema.parse(pt))
//     .map((tag: TagWithTranslations) => DbTagToPublicTagTransform(tag))
// }



// export function mapProfileTags(profileTags: ProfileTag[], locale: string): PublicTag[] {
//   return profileTags
//     .map((pt: TagWithTranslations) => ProfileTagToTagTransformSchema.parse(pt))
//     .map((tag: TagWithTranslations) => DbTagToPublicTagTransform(tag, locale))
// }

export function mapProfileTagsTranslated(profileTags: ProfileTagJoin[], locale: string): PublicTag[] {
  return profileTags
    .map((pt: ProfileTagJoin) => {
      const tag = ProfileTagJoinSchema.parse(pt).tag
      return DbTagToPublicTagTransform(tag, locale)
    })
}

// export function mapProfileTags(tag: TagWithTranslations, locale: string): PublicTag {
//   const translation =
//     tag.translations.find(t => t.locale === locale) ??
//     tag.translations[0] // fallback

//   return {
//     id: tag.id,
//     slug: tag.slug,
//     name: translation?.name ?? '',
//   }
// }