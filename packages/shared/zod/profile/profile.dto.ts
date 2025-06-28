import { z } from "zod";


import {
  ProfileSchema,
  ConversationSchema,
} from "../generated";



import { PublicTagSchema } from "../tag/tag.dto";
import { PublicProfileImageSchema } from "./profileimage.dto";
import { LocationSchema } from "@zod/dto/location.dto";
import { baseFields, socialFields, datingFields, ownerFields } from "./profile.fields";
import { InteractionContextSchema } from "@zod/datinginteraction/interactionContext.dto";
import { ConversationContextSchema } from "@zod/messaging/conversationContext.dto";

const PublicScalarsSchema = ProfileSchema.pick({
  ...baseFields,
  ...socialFields,
}).extend({
  isDatingActive: z.literal(false)
})

const PublicDatingScalarsSchema = ProfileSchema.pick({
  ...baseFields,
  ...socialFields,
  ...datingFields,
}).extend({
  isDatingActive: z.literal(true)
})

export const ProfileUnionSchema = z.discriminatedUnion('isDatingActive', [
  // when isDatingActive = false, use the base
  PublicScalarsSchema,
  // when isDatingActive = true, require the dating picks
  PublicDatingScalarsSchema,
])

export const PublicProfileSchema = ProfileUnionSchema.and(
  z.object({
    location: LocationSchema,
    profileImages: z.array(PublicProfileImageSchema).default([]),
    tags: z.array(PublicTagSchema).default([]),
    introSocial: z.string().default(''),
    introDating: z.string().default(''),
  })
);
export type PublicProfile = z.infer<typeof PublicProfileSchema>;



export const PublicProfileWithContextSchema = ProfileUnionSchema.and(
  z.object({
    location: LocationSchema,
    profileImages: z.array(PublicProfileImageSchema).default([]),
    tags: z.array(PublicTagSchema).default([]),
    introSocial: z.string().default(''),
    introDating: z.string().default(''),
    conversation: ConversationSchema.nullable(),
    conversationContext: ConversationContextSchema,
    interactionContext: InteractionContextSchema,
  })
)
export const PublicProfileArraySchema = z.array(PublicProfileSchema);

export type PublicProfileWithContext = z.infer<typeof PublicProfileWithContextSchema>;


export const OwnerScalarsSchema = ProfileSchema.pick({
  ...baseFields,
  ...socialFields,
  ...datingFields,
  ...ownerFields,
});

export const LocalizedStringSchema = z.record(z.string(), z.string()).default({})
// API -> client DTO 
export const OwnerProfileSchema = OwnerScalarsSchema.extend({
  introSocialLocalized: LocalizedStringSchema,
  introDatingLocalized: LocalizedStringSchema,

  profileImages: z.array(PublicProfileImageSchema).default([]),
  tags: z.array(PublicTagSchema).default([]),
  location: LocationSchema
})
export type OwnerProfile = z.infer<typeof OwnerProfileSchema>;

export type OwnerOrPublicProfile = OwnerProfile | PublicProfileWithContext

export const editableFields = {
  ...socialFields,
  ...datingFields,
  isDatingActive: true,
  isSocialActive: true,

} as const;


// Client -> API DTO profile editing payload
export const UpdateProfilePayloadSchema = ProfileSchema.pick({
  ...editableFields,
  cityId: true,
  country: true,
  cityName: true,
})
  .extend({
    tags: z.array(z.string().cuid()),
    introSocialLocalized: z.record(z.string(), z.string()).optional(),
    introDatingLocalized: z.record(z.string(), z.string()).optional(),
  })
  .partial()

export type UpdateProfilePayload = z.infer<typeof UpdateProfilePayloadSchema>;



// Client -> API DTO used in conversations
export const ProfileSummarySchema = z.object({
  id: z.string(),
  publicName: z.string(),
  profileImages: z.array(PublicProfileImageSchema)
})

export type ProfileSummary = z.infer<typeof ProfileSummarySchema>;


export const ProfileScopeSchema = z.enum(['social', 'dating'])

export type ProfileScope = z.infer<typeof ProfileScopeSchema>


export const UpdateProfileScopeSchemaPayload = z.object({
  isDatingActive: z.boolean(),
  isSocialActive: z.boolean(),
}).partial()

export type UpdateProfileScopePayload = z.infer<typeof UpdateProfileScopeSchemaPayload>


export const BlockProfilePayloadSchema = z.object({
  targetId: z.string().cuid(), // The profile being blocked/unblocked
});

export type BlockProfilePayload = z.infer<typeof BlockProfilePayloadSchema>;


