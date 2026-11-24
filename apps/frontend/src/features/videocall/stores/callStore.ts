import { defineStore } from 'pinia'
import { ref } from 'vue'
import { bus } from '@/lib/bus'
import { tracker } from '@/lib/umami'
import * as callsApi from '../api/calls.api'

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'active'

export const useCallStore = defineStore('call', () => {
  const status = ref<CallStatus>('idle')
  const conversationId = ref<string | null>(null)
  const roomName = ref<string | null>(null)
  const callerInfo = ref<{ id: string; publicName: string } | null>(null)
  const timeoutHandle = ref<ReturnType<typeof setTimeout> | null>(null)
  let connectedAt: number | null = null

  const RING_TIMEOUT_MS = 30_000

  function reset() {
    clearTimeout(timeoutHandle.value!)
    timeoutHandle.value = null
    status.value = 'idle'
    conversationId.value = null
    roomName.value = null
    callerInfo.value = null
    connectedAt = null
  }

  function markConnected() {
    status.value = 'active'
    connectedAt = Date.now()
  }

  async function initiateCall(convoId: string) {
    if (status.value !== 'idle') return

    try {
      const res = await callsApi.initiateCall(convoId)
      conversationId.value = convoId
      roomName.value = res.data.roomName
      status.value = 'calling'
      tracker.track('call-initiated')

      // Auto-cancel after 30s
      timeoutHandle.value = setTimeout(() => {
        cancelCall('timeout')
      }, RING_TIMEOUT_MS)
    } catch {
      tracker.track('call-initiate-failed')
      reset()
    }
  }

  async function acceptCall() {
    if (status.value !== 'ringing' || !conversationId.value) return

    try {
      await callsApi.acceptCall(conversationId.value)
      tracker.track('call-accepted')
      markConnected()
    } catch {
      reset()
    }
  }

  async function declineCall() {
    if (status.value !== 'ringing' || !conversationId.value) return
    tracker.track('call-declined')

    try {
      await callsApi.declineCall(conversationId.value)
    } finally {
      reset()
    }
  }

  async function cancelCall(reason: 'caller' | 'timeout' = 'caller') {
    if (status.value !== 'calling' || !conversationId.value) return
    tracker.track('call-cancelled', { reason })

    try {
      await callsApi.cancelCall(conversationId.value)
    } finally {
      reset()
    }
  }

  function endCall() {
    if (status.value === 'active' && connectedAt !== null) {
      tracker.track('call-ended', { durationSec: Math.round((Date.now() - connectedAt) / 1000) })
    }
    reset()
  }

  function handleIncomingCall(payload: {
    conversationId: string
    roomName: string
    caller: { id: string; publicName: string }
  }) {
    if (status.value !== 'idle') return
    conversationId.value = payload.conversationId
    roomName.value = payload.roomName
    callerInfo.value = payload.caller
    status.value = 'ringing'
    tracker.track('call-incoming')
  }

  function handleCallAccepted(payload: { conversationId: string; roomName: string }) {
    if (status.value !== 'calling') return
    clearTimeout(timeoutHandle.value!)
    timeoutHandle.value = null
    roomName.value = payload.roomName
    tracker.track('call-connected')
    markConnected()
  }

  function handleCallDeclined(_payload: { conversationId: string }) {
    if (status.value !== 'calling') return
    tracker.track('call-declined-by-partner')
    reset()
  }

  function handleCallCancelled(_payload: { conversationId: string }) {
    if (status.value !== 'ringing') return
    tracker.track('call-missed')
    reset()
  }

  function initialize() {
    bus.on('ws:incoming_call', handleIncomingCall)
    bus.on('ws:call_accepted', handleCallAccepted)
    bus.on('ws:call_declined', handleCallDeclined)
    bus.on('ws:call_cancelled', handleCallCancelled)
  }

  function teardown() {
    clearTimeout(timeoutHandle.value!)
    bus.off('ws:incoming_call', handleIncomingCall)
    bus.off('ws:call_accepted', handleCallAccepted)
    bus.off('ws:call_declined', handleCallDeclined)
    bus.off('ws:call_cancelled', handleCallCancelled)
    reset()
  }

  return {
    status,
    conversationId,
    roomName,
    callerInfo,
    initiateCall,
    acceptCall,
    declineCall,
    cancelCall,
    endCall,
    handleIncomingCall,
    handleCallAccepted,
    handleCallDeclined,
    handleCallCancelled,
    initialize,
    teardown,
  }
})
