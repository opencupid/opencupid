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
  ProfileOptInSettings,
  ProfileSummary,
  PublicProfileWithContext,
} from '@zod/profile/profile.dto'
import type { PublicTag, PopularTag } from '@zod/tag/tag.dto'
import type { ConversationSummary, MessageDTO } from '@zod/messaging/messaging.dto'
import type { LoginUser, SettingsUser } from '@zod/user/user.dto'
import type { LocationDTO } from '@zod/dto/location.dto'
import type { VersionDTO } from '@zod/dto/version.dto'
import type { SocialMatchFilterDTO } from '@zod/match/filters.dto'
import type { DatingPreferencesFormType } from '@zod/match/filters.form'
import { AuthErrorCodes } from '@zod/user/auth.dto'
import {
  type InteractionEdgePair,
  type InteractionEdge,
  type InteractionStats,
  type ReceivedLike,
} from './interaction/interaction.dto'

import type { OwnerPost, PublicPostWithProfile } from '@zod/post/post.dto'

export type GetProfileSummariesResponse = ApiSuccess<{ profiles: ProfileSummary[] }>

export type GetSocialMatchFilterResponse = ApiSuccess<{ filter: SocialMatchFilterDTO }>

export type GetDatingPreferencesResponse = ApiSuccess<{ prefs: DatingPreferencesFormType }>
export type UpdateDatingPreferencesResponse = ApiSuccess<{ prefs: DatingPreferencesFormType }>

export type GetMyProfileResponse = ApiSuccess<{ profile: OwnerProfile }>
export type GetProfileOptInResponse = ApiSuccess<{ optIn: ProfileOptInSettings }>
export type GetPublicProfileResponse = ApiSuccess<{ profile: PublicProfileWithContext }>
export type GetProfilesResponse = ApiSuccess<{ profiles: PublicProfileWithContext[] }>
export type GetMatchIdsResponse = ApiSuccess<{ ids: string[] }>
export type UpdateProfileResponse = ApiSuccess<{ profile: OwnerProfile }>
export type UpdateProfileScopeResponse = ApiSuccess<{
  isDatingActive: boolean
  isActive: boolean
}>
export type UpdateProfileOptInResponse = ApiSuccess<{ optIn: ProfileOptInSettings }>

export type TagsResponse = ApiSuccess<{ tags: PublicTag[] }>
export type TagResponse = ApiSuccess<{ tag: PublicTag }>
export type PopularTagsResponse = ApiSuccess<{ tags: PopularTag[] }>

export type LocationResponse = ApiSuccess<{ location: LocationDTO }>
export type VersionResponse = ApiSuccess<{ version: VersionDTO }>

export type MessagesResponse = ApiSuccess<{
  messages: MessageDTO[]
  nextCursor: string | null
  hasMore: boolean
}>
export type ConversationsResponse = ApiSuccess<{ conversations: ConversationSummary[] }>
export type ConversationResponse = ApiSuccess<{ conversation: ConversationSummary }>
export type SendMessageResponse = ApiSuccess<{
  conversation: ConversationSummary
  message: MessageDTO
}>

export type InitiateConversationResponse = ApiSuccess<{}>

export type InteractionEdgesResponse = ApiSuccess<{ edges: InteractionEdge[] }>
export type ReceivedLikesResponse = ApiSuccess<{ edges: ReceivedLike[] }>
export type InteractionEdgeResponse = ApiSuccess<{ pair: InteractionEdgePair }>
export type InteractionEdgeCountResponse = ApiSuccess<{ count: number }>
export type InteractionStatsResponse = ApiSuccess<{ stats: InteractionStats }>

export type AuthResponse<T> = ApiSuccess<T> | (ApiError & { code: AuthErrorCodes })
export type GetUserSettingsResponse = ApiSuccess<{ user: SettingsUser }>
export type UpdateUserLanguageResponse = ApiSuccess<{}>
export type SendMagicLinkResponse = ApiSuccess<{ user: LoginUser; status: string }>
export type VerifyTokenSuccess = AuthResponse<{ token: string; refreshToken: string }>
export interface VerifyTokenFailure {
  success: false
  status: string
}
export type VerifyTokenResponse = VerifyTokenSuccess | VerifyTokenFailure

export type RefreshTokenResponse = ApiSuccess<{ token: string; refreshToken: string }>
export type WsTicketResponse = ApiSuccess<{ ticket: string }>

export type CaptchaChallengeResponse = ApiSuccess<any> // altcha challenge shape

// Post responses
export type PostsResponse = ApiSuccess<{ posts: PublicPostWithProfile[] }>
export type MyPostsResponse = ApiSuccess<{ posts: OwnerPost[] }>
export type PostResponse = ApiSuccess<{ post: OwnerPost }>
export type CreatePostResponse = ApiSuccess<{ post: OwnerPost }>
export type UpdatePostResponse = ApiSuccess<{ post: OwnerPost }>
export type DeletePostResponse = ApiSuccess<{}>
