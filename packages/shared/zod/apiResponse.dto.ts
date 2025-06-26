export interface ApiError {
  success: false
  message: string
  fieldErrors?: Record<string, string[]>
}

export type ApiSuccess<T> = { success: true } & T
export type ApiResponse<T> = ApiSuccess<T> | ApiError

// Profile responses
import type {
  OwnerProfile,
  ProfileSummary,
  PublicProfileWithContext,
} from '@zod/profile/profile.dto'
import type { PublicTag } from '@zod/tag/tag.dto'
import type { ConversationSummary, MessageDTO } from '@zod/messaging/messaging.dto'
import type { SettingsUser, OtpSendReturn } from '@zod/user/user.dto'
import type { PublicCity } from '@zod/dto/city.dto'
import type { LocationDTO } from '@zod/dto/location.dto'
import type { DatingPreferencesDTO } from '@zod/match/datingPreference.dto'
import { AuthErrorCodes } from '@zod/user/auth.dto'

export type GetProfileSummariesResponse = ApiSuccess<{ profiles: ProfileSummary[] }>
export type GetDatingPreferenceseResponse = ApiSuccess<{ prefs: DatingPreferencesDTO }>
export type UpdateDatingPreferencesResponse = ApiSuccess<{ prefs: DatingPreferencesDTO }>

export type GetMyProfileResponse = ApiSuccess<{ profile: OwnerProfile }>
export type GetPublicProfileResponse = ApiSuccess<{ profile: PublicProfileWithContext }>
export type GetProfilesResponse = ApiSuccess<{ profiles: PublicProfileWithContext[] }>
export type UpdateProfileResponse = ApiSuccess<{ profile: OwnerProfile }>

export type TagsResponse = ApiSuccess<{ tags: PublicTag[] }>
export type TagResponse = ApiSuccess<{ tag: PublicTag }>

export type CitiesResponse = ApiSuccess<{ cities: PublicCity[] }>
export type CityResponse = ApiSuccess<{ city: PublicCity }>
export type LocationResponse = ApiSuccess<{ location: LocationDTO }>

export type MessagesResponse = ApiSuccess<{ messages: MessageDTO[] }>
export type ConversationsResponse = ApiSuccess<{ conversations: ConversationSummary[] }>
export type ConversationResponse = ApiSuccess<{ conversation: ConversationSummary }>
export type SendMessageResponse = ApiSuccess<{
  conversation: ConversationSummary
  message: MessageDTO
}>

export type InitiateConversationResponse = ApiSuccess<{
}>

export type AuthResponse<T> = ApiSuccess<T>| ApiError & { code: AuthErrorCodes }
export type UserMeResponse = ApiSuccess<{ user: SettingsUser }>
export type SendLoginLinkResponse = ApiSuccess<{ user: OtpSendReturn; status: string }>
export type OtpLoginSuccess = AuthResponse<{ token: string }>
export interface OtpLoginFailure {
  success: false
  status: string
}
export type OtpLoginResponse = OtpLoginSuccess | OtpLoginFailure




export type CitySearchResponse = PublicCity[]
export type CaptchaChallengeResponse = ApiSuccess<any> // altcha challenge shape
