import { api, safeApiCall } from '@/lib/api'

export function initiateCall(conversationId: string) {
  return safeApiCall(() => api.post('/calls', { conversationId }))
}

export function acceptCall(conversationId: string) {
  return safeApiCall(() => api.post(`/calls/${conversationId}/accept`))
}

export function declineCall(conversationId: string) {
  return safeApiCall(() => api.post(`/calls/${conversationId}/decline`))
}

export function cancelCall(conversationId: string) {
  return safeApiCall(() => api.post(`/calls/${conversationId}/cancel`))
}

export function updateCallable(conversationId: string, isCallable: boolean) {
  return safeApiCall(() => api.patch(`/calls/${conversationId}/callable`, { isCallable }))
}
