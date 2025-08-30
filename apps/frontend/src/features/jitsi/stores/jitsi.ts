import { defineStore } from 'pinia'

interface Meeting {
  id: string
  room: string
}

interface MeetingState {
  currentMeeting: Meeting | null
  loading: boolean
  error: string | null
}

const apiBase = __APP_CONFIG__?.API_BASE_URL || ''

export const useJitsiStore = defineStore('jitsi', {
  state: (): MeetingState => ({
    currentMeeting: null,
    loading: false,
    error: null,
  }),
  actions: {
    makePublicRoomName(a: string, b: string) {
      const rand = Math.random().toString(36).slice(2)
      return `oc-${a}-${b}-${rand}-${Date.now()}`
    },
    async createMeeting(payload: { room: string; targetProfileId: string }) {
      this.loading = true
      try {
        const res = await fetch(`${apiBase}/meetings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.success) {
          this.currentMeeting = data.meeting
          this.error = null
          return data.meeting as Meeting
        }
        this.error = data.message || 'Failed to create meeting'
        return null
      } catch (err: any) {
        this.error = err.message
        return null
      } finally {
        this.loading = false
      }
    },
    async fetchLatest(withProfileId: string) {
      this.loading = true
      try {
        const res = await fetch(`${apiBase}/meetings/latest?withProfileId=${withProfileId}`, {
          credentials: 'include',
        })
        const data = await res.json()
        if (data.success && data.meeting) {
          this.currentMeeting = data.meeting
          return data.meeting as Meeting
        }
        return null
      } catch (err: any) {
        this.error = err.message
        return null
      } finally {
        this.loading = false
      }
    },
    async endMeeting(id: string) {
      try {
        await fetch(`${apiBase}/meetings/${id}/end`, {
          method: 'POST',
          credentials: 'include',
        })
      } catch (err: any) {
        this.error = err.message
      }
      this.currentMeeting = null
    },
  },
})
