import { defineStore } from 'pinia'
import { api, safeApiCall } from '@/lib/api'
import {
  OwnerEventSchema,
  type OwnerEvent,
  type CreateEventPayload,
  type UpdateEventPayload,
} from '@zod/event/event.dto'
import type {
  CreateEventResponse,
  UpdateEventResponse,
  DeleteEventResponse,
} from '@zod/apiResponse.dto'
import { storeSuccess, storeError, type StoreResponse } from '@/store/helpers'

type StoreEventResponse = StoreResponse<{ event: OwnerEvent }>

export const useEventStore = defineStore('events', {
  state: () => ({
    /** Owner-scoped event list — populated by future fetchMyEvents. */
    myEvents: [] as OwnerEvent[],
    currentEvent: null as OwnerEvent | null,
  }),

  actions: {
    async createEvent(payload: CreateEventPayload): Promise<StoreEventResponse> {
      try {
        const res = await safeApiCall(() =>
          api.post<CreateEventResponse>('/content/events', payload)
        )
        const event = OwnerEventSchema.parse(res.data.event)
        this.myEvents.unshift(event)
        return storeSuccess({ event })
      } catch (error: any) {
        return storeError(error, 'Failed to create event')
      }
    },

    async updateEvent(id: string, payload: UpdateEventPayload): Promise<StoreEventResponse> {
      try {
        const res = await safeApiCall(() =>
          api.patch<UpdateEventResponse>(`/content/events/${id}`, payload)
        )
        const event = OwnerEventSchema.parse(res.data.event)

        const index = this.myEvents.findIndex((e) => e.id === id)
        if (index !== -1) {
          this.myEvents[index] = event
        }
        if (this.currentEvent?.id === id) {
          this.currentEvent = event
        }

        return storeSuccess({ event })
      } catch (error: any) {
        return storeError(error, 'Failed to update event')
      }
    },

    async deleteEvent(id: string): Promise<StoreResponse<void>> {
      try {
        await safeApiCall(() => api.delete<DeleteEventResponse>(`/content/events/${id}`))
        this.myEvents = this.myEvents.filter((event) => event.id !== id)
        if (this.currentEvent?.id === id) {
          this.currentEvent = null
        }
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to delete event')
      }
    },
  },
})
