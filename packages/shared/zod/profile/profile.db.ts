import z from "zod";
import {
  CitySchema,
  ConversationParticipantSchema,
  ConversationSchema,
  HiddenProfileSchema,
  LikedProfileSchema,
  LocalizedProfileFieldSchema,
  ProfileImageSchema,
  ProfileSchema,
} from "@zod/generated";
import { TagWithTranslationsSchema } from "@zod/tag/tag.db";
import { datingFields, ownerFields, socialFields } from "./profile.fields";

export const DbProfileSchema = ProfileSchema.extend({
  localized: z.array(LocalizedProfileFieldSchema).default([]),
  tags: z.array(TagWithTranslationsSchema).default([]),
  city: CitySchema
})
export type DbProfile = z.infer<typeof DbProfileSchema>;

export const DbProfileWithImagesSchema = DbProfileSchema.extend({
  city: CitySchema.nullable(),
  profileImages: z.array(ProfileImageSchema).default([]),
})
export type DbProfileWithImages = z.infer<typeof DbProfileWithImagesSchema>;

export const DbMinimalProfileSchema = z.object({
  id: z.string(),
  publicName: z.string(),
  profileImages: z.array(z.object({ storagePath: z.string() }))
})
export type DbProfileSummary = z.infer<typeof DbMinimalProfileSchema>;

export const DbProfileWithContextSchema = DbProfileWithImagesSchema.extend({
  conversationParticipants: z
    .array(ConversationParticipantSchema.extend({
      conversation: ConversationSchema,
    }))
    .default([]),

  likesReceived: z.array(LikedProfileSchema),
  likesSent: z.array(LikedProfileSchema),
  hiddenBy: z.array(HiddenProfileSchema),
  blockedByProfiles: z.array(ProfileSchema),
  blockedProfiles: z.array(ProfileSchema),
})

export type DbProfileWithContext = z.infer<typeof DbProfileWithContextSchema>;


export const DbOwnerUpdateScalarsSchema = ProfileSchema.pick({
  ...socialFields,
  ...datingFields,
  ...ownerFields,
  ...datingFields
}).partial()

export type DbOwnerUpdateScalars = z.infer<typeof DbOwnerUpdateScalarsSchema>;