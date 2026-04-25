import { apiRequest } from './useApi'

export type TrustReason = 'PROFILE_UNVETTED' | 'SPAM_BURST'

/**
 * Bare flag record as the backend writes it (no joined profile).
 * Returned by POST /admin/profiles/:id/flag.
 */
export interface ProfileTrustFlag {
  id: string
  profileId: string
  reason: TrustReason
  flaggedAt: string
  flaggedBy: string
  clearedAt: string | null
  clearedBy: string | null
  evidence: unknown
}

/**
 * Flag row joined with a small profile projection.
 * Returned by GET /admin/trust-flags for the moderation list.
 */
export interface TrustFlagRow extends ProfileTrustFlag {
  profile: {
    id: string
    publicName: string
    country: string
    cityName: string
  }
}

export interface ListTrustFlagsResponse {
  success: true
  flags: TrustFlagRow[]
  total: number
  page: number
  pageSize: number
}

export function listTrustFlags(opts: {
  activeOnly?: boolean
  reason?: TrustReason
  page: number
  pageSize: number
}) {
  return apiRequest<ListTrustFlagsResponse>('/admin/trust-flags', {
    params: {
      page: opts.page,
      pageSize: opts.pageSize,
      activeOnly: opts.activeOnly === false ? 'false' : undefined,
      reason: opts.reason,
    },
  })
}

export function clearTrustFlag(id: string) {
  return apiRequest<{ success: true }>(`/admin/trust-flags/${id}/clear`, { method: 'POST' })
}

export function flagProfile(profileId: string, note: string) {
  return apiRequest<{ success: true; flag: ProfileTrustFlag }>(
    `/admin/profiles/${profileId}/flag`,
    {
      method: 'POST',
      body: { note },
    }
  )
}
