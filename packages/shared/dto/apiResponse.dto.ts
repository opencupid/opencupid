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
  PublicProfileWithConversation,
} from '@zod/profile/profile.dto'
import type { PublicTag } from '@zod/tag/tag.dto'
import type { ConversationSummary, MessageDTO } from '@zod/messaging/messaging.dto'
import type { SettingsUser, OtpSendReturn } from '@zod/user/user.dto'
import type { PublicCity } from '@zod/dto/city.dto'
import type { DatingPreferencesDTO } from '@zod/profile/datingPreference.dto'

export type GetDatingPreferenceseResponse = ApiSuccess<{ prefs: DatingPreferencesDTO }>
export type UpdateDatingPreferencesResponse = ApiSuccess<{ prefs: DatingPreferencesDTO }>

export type GetMyProfileResponse = ApiSuccess<{ profile: OwnerProfile }>
export type GetPublicProfileResponse = ApiSuccess<{ profile: PublicProfileWithConversation }>
export type GetProfilesResponse = ApiSuccess<{ profiles: PublicProfileWithConversation[] }>
export type UpdateProfileResponse = ApiSuccess<{ profile: OwnerProfile }>

export type TagsResponse = ApiSuccess<{ tags: PublicTag[] }>
export type TagResponse = ApiSuccess<{ tag: PublicTag }>

export type CitiesResponse = ApiSuccess<{ cities: PublicCity[] }>
export type CityResponse = ApiSuccess<{ city: PublicCity }>

export type MessagesResponse = ApiSuccess<{ messages: MessageDTO[] }>
export type ConversationsResponse = ApiSuccess<{ conversations: ConversationSummary[] }>
export type ConversationResponse = ApiSuccess<{ conversation: ConversationSummary }>
export type SendMessageResponse = ApiSuccess<{
  conversation: ConversationSummary
  message: MessageDTO
}>

export type InitiateConversationResponse = ApiSuccess<{
}>

export type UserMeResponse = ApiSuccess<{ user: SettingsUser }>
export type SendLoginLinkResponse = ApiSuccess<{ user: OtpSendReturn; status: string }>
export type OtpLoginSuccess = ApiSuccess<{ token: string }>
export interface OtpLoginFailure {
  success: false
  status: string
}
export type OtpLoginResponse = OtpLoginSuccess | OtpLoginFailure

export type CitySearchResponse = PublicCity[]
export type CaptchaChallengeResponse = ApiSuccess<any> // altcha challenge shape
