import { apiRequest } from './useApi'

export type TrustReason = 'PROFILE_UNVETTED' | 'SPAM_BURST'

export interface TrustFlagRow {
  id: string
  profileId: string
  reason: TrustReason
  flaggedAt: string
  flaggedBy: string
  clearedAt: string | null
  clearedBy: string | null
  evidence: unknown
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
  return apiRequest<{ success: true; flag: TrustFlagRow }>(`/admin/profiles/${profileId}/flag`, {
    method: 'POST',
    body: { note },
  })
}
