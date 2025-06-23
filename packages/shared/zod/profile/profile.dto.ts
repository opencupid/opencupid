import { z } from "zod";


import {
  ProfileSchema,
  ConversationSchema,
  type LocalizedProfileField,
  type Profile,
} from "../generated";



import { PublicTagSchema } from "../tag/tag.dto";
import { PublicProfileImageSchema } from "./profileimage.dto";
import { LocationSchema } from "@zod/dto/location.dto";
import { baseFields, socialFields, datingFields, ownerFields } from "./profile.fields";

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
  })
);
export type PublicProfile = z.infer<typeof PublicProfileSchema>;

export const PublicProfileWithContextSchema = ProfileUnionSchema.and(
  z.object({
    location: LocationSchema,
    profileImages: z.array(PublicProfileImageSchema).default([]),
    tags: z.array(PublicTagSchema).default([]),
    conversation: ConversationSchema.nullable(),
  })
);
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




// localized profile fields
type ProfileWithLocalized = Profile & { localized: LocalizedProfileField[] }

