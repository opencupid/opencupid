import { defineStore } from 'pinia'
import { api, axios, safeApiCall } from '@/lib/api'
import type { ApiError } from '@zod/apiResponse.dto'
import {
  type ImageApiResponse,
  ImageApiResponseSchema,
  type OwnerImage,
  type ImagePosition,
} from '@zod/image/image.dto'
import { bus } from '@/lib/bus'
import type { GalleryStoreResponse } from './galleryStore'

export const useProfileImageStore = defineStore('profileImage', {
  state: () => ({
    images: [] as OwnerImage[],
    isLoading: false,
  }),

  actions: {
    async upload(file: File, captionText: string): Promise<GalleryStoreResponse> {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('captionText', captionText)
      try {
        this.isLoading = true
        const { data } = await safeApiCall(() => api.post<ImageApiResponse>('/image', formData))
        const { images } = ImageApiResponseSchema.parse(data)
        this.images = images
        return { success: true }
      } catch (err: unknown) {
        return mapStoreError(err)
      } finally {
        this.isLoading = false
      }
    },

    async remove(image: OwnerImage): Promise<GalleryStoreResponse> {
      try {
        this.isLoading = true
        const { data } = await safeApiCall(() => api.delete<ImageApiResponse>(`/image/${image.id}`))
        const { images } = ImageApiResponseSchema.parse(data)
        this.images = images
        return { success: true }
      } catch (err) {
        return { success: false, message: 'An unexpected error occurred' }
      } finally {
        this.isLoading = false
      }
    },

    async reorder(items: ImagePosition[]): Promise<GalleryStoreResponse> {
      try {
        this.isLoading = true
        const { data } = await safeApiCall(() =>
          api.patch<ImageApiResponse>('/image/order', { images: items })
        )
        const { images } = ImageApiResponseSchema.parse(data)
        this.images = images
        return { success: true }
      } catch {
        this.images = []
        return { success: false, message: 'An unexpected error occurred' }
      } finally {
        this.isLoading = false
      }
    },

    async load(): Promise<GalleryStoreResponse> {
      try {
        this.isLoading = true
        const { data } = await safeApiCall(() => api.get<ImageApiResponse>('/image/me'))
        const { images } = ImageApiResponseSchema.parse(data)
        this.images = images
        return { success: true }
      } catch (err: any) {
        console.error('Failed to fetch profile images:', err)
        this.images = []
        return {
          success: false,
          message: err.response?.data?.message || 'Failed to fetch profile images',
        }
      } finally {
        this.isLoading = false
      }
    },

    teardown() {
      this.images = []
    },
  },
})

function mapStoreError(err: unknown): GalleryStoreResponse {
  const out: ApiError = { success: false, message: 'An unexpected error occurred' }
  if (axios.isAxiosError(err) && err.response) {
    const resp = err.response.data as Partial<ApiError>
    out.message = resp.message ?? out.message
    if (resp.fieldErrors) out.fieldErrors = resp.fieldErrors
  } else if (err instanceof Error) {
    out.message = err.message
  }
  return out
}

bus.on('auth:logout', () => {
  useProfileImageStore().teardown()
})
