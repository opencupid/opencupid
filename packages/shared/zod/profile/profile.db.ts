import {
  ConversationParticipantSchema,
  ConversationSchema,
  HiddenProfileSchema,
  LikedProfileSchema,
  LocalizedProfileFieldSchema,
  ProfileImageSchema,
  ProfileSchema,
  ProfileTagSchema
} from "@zod/generated";
import { TagWithTranslationsSchema } from "@zod/tag/tag.db";
import z from "zod";
import { datingFields, ownerFields, socialFields } from "./profile.fields";
import { InteractionContextSchema } from "@zod/datinginteraction/interactionContext.dto";

export const DbProfileSchema = ProfileSchema.extend({
  localized: z.array(LocalizedProfileFieldSchema).default([]),
  tags: z.array(ProfileTagSchema.extend({
    tag: TagWithTranslationsSchema
  })).default([]),
})
export type DbProfile = z.infer<typeof DbProfileSchema>;

export const DbProfileWithImagesSchema = DbProfileSchema.extend({
  profileImages: z.array(ProfileImageSchema).default([]),
})
export type DbProfileWithImages = z.infer<typeof DbProfileWithImagesSchema>;



export const DbProfileWithContextSchema = DbProfileWithImagesSchema.extend({
  conversationParticipants: z
    .array(ConversationParticipantSchema.extend({
      conversation: ConversationSchema,
    }))
    .default([]),

  likesReceived: z.array(LikedProfileSchema),
  likesSent: z.array(LikedProfileSchema),
  hiddenBy: z.array(HiddenProfileSchema),
})

export type DbProfileWithContext = z.infer<typeof DbProfileWithContextSchema>;


export const DbOwnerUpdateScalarsSchema = ProfileSchema.pick({
  ...socialFields,
  ...datingFields,
  ...ownerFields,
  ...datingFields
}).partial()

export type DbOwnerUpdateScalars = z.infer<typeof DbOwnerUpdateScalarsSchema>;