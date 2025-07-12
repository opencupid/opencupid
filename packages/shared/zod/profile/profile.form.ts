import z from "zod";

import { LocationSchema } from "@zod/dto/location.dto";
import { PublicTagSchema } from "@zod/tag/tag.dto";
import { ProfileSchema } from "@zod/generated";
import { editableFields, LocalizedStringSchema } from "./profile.dto";
import { PublicProfileImageSchema } from "./profileimage.dto";



// Onboarding form schema 
export const EditProfileFormSchema = ProfileSchema.pick({
  ...editableFields,
}).extend({
  introSocialLocalized: LocalizedStringSchema,
  introDatingLocalized: LocalizedStringSchema,

  tags: z.array(PublicTagSchema).default([]),
  location: LocationSchema
})
export type EditProfileForm = z.infer<typeof EditProfileFormSchema>;

// this is used for editing fields in the profile edit modals. only neccessary
// because we use EditField.vue to implement the in-place modal, we're not 
// actually touching the profile images 
export type EditFieldProfileFormWithImages = EditProfileForm & {
  profileImages: z.infer<typeof PublicProfileImageSchema>[];
}

export const ProfileFormToPayloadTransform = EditProfileFormSchema.transform((data) => {
  const { location, ...rest } = data;
  return {
    ...rest,
    tags: data.tags.map(tag => tag.id),
    // cityId: data.location.cityId,
    country: data.location.country,
    cityName: data.location.cityName,
    lat: data.location.lat,
    lon: data.location.lon,
    // location: undefined
  }
})
