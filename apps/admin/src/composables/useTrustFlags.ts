import { apiRequest } from './useApi'

export type TrustReason = 'PROFILE_UNVETTED' | 'SPAM_BURST'

export type FlagOrigin = 'admin' | 'heuristic' | 'system'

/**
 * Who wrote a flag, from its flaggedBy prefix (`admin:`, `heuristic:`, `system:`).
 * Only admin flags are never cleared by automation.
 */
export function flagOrigin(flaggedBy: string): FlagOrigin {
  if (flaggedBy.startsWith('admin:')) return 'admin'
  if (flaggedBy.startsWith('heuristic:')) return 'heuristic'
  return 'system'
}

export const flagOriginBadgeClass: Record<FlagOrigin, string> = {
  admin: 'badge bg-danger',
  heuristic: 'badge bg-warning text-dark',
  system: 'badge bg-secondary',
}

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
  evidence: string
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
