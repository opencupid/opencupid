import { defineStore } from 'pinia'
import { ref } from 'vue'
import { bus } from '@/lib/bus'
import * as callsApi from '../api/calls.api'

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'active'

export const useCallStore = defineStore('call', () => {
  const status = ref<CallStatus>('idle')
  const conversationId = ref<string | null>(null)
  const roomName = ref<string | null>(null)
  const callerInfo = ref<{ id: string; publicName: string } | null>(null)
  const timeoutHandle = ref<ReturnType<typeof setTimeout> | null>(null)

  const RING_TIMEOUT_MS = 30_000

  function reset() {
    clearTimeout(timeoutHandle.value!)
    timeoutHandle.value = null
    status.value = 'idle'
    conversationId.value = null
    roomName.value = null
    callerInfo.value = null
  }

  async function initiateCall(convoId: string) {
    if (status.value !== 'idle') return

    try {
      const res = await callsApi.initiateCall(convoId)
      conversationId.value = convoId
      roomName.value = res.data.roomName
      status.value = 'calling'

      // Auto-cancel after 30s
      timeoutHandle.value = setTimeout(() => {
        cancelCall()
      }, RING_TIMEOUT_MS)
    } catch {
      reset()
    }
  }

  async function acceptCall() {
    if (status.value !== 'ringing' || !conversationId.value) return

    try {
      await callsApi.acceptCall(conversationId.value)
      status.value = 'active'
    } catch {
      reset()
    }
  }

  async function declineCall() {
    if (status.value !== 'ringing' || !conversationId.value) return

    try {
      await callsApi.declineCall(conversationId.value)
    } finally {
      reset()
    }
  }

  async function cancelCall() {
    if (status.value !== 'calling' || !conversationId.value) return

    try {
      await callsApi.cancelCall(conversationId.value)
    } finally {
      reset()
    }
  }

  function endCall() {
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
  }

  function handleCallAccepted(payload: { conversationId: string; roomName: string }) {
    if (status.value !== 'calling') return
    clearTimeout(timeoutHandle.value!)
    timeoutHandle.value = null
    roomName.value = payload.roomName
    status.value = 'active'
  }

  function handleCallDeclined(_payload: { conversationId: string }) {
    if (status.value !== 'calling') return
    reset()
  }

  function handleCallCancelled(_payload: { conversationId: string }) {
    if (status.value !== 'ringing') return
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
