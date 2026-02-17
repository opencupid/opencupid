import z from 'zod'
import { defineStore } from 'pinia'
import { api, axios, safeApiCall } from '@/lib/api'
import type { ApiError, ApiSuccess } from '@zod/apiResponse.dto'
import {
  type ImageApiResponse,
  ImageApiResponseSchema,
  type OwnerProfileImage,
  type ProfileImagePosition,
} from '@zod/profile/profileimage.dto'
import { bus } from '@/lib/bus'

type ImageStoreResponse = ApiSuccess<{}> | ApiError

export const useImageStore = defineStore('image', {
  state: () => ({
    images: [] as OwnerProfileImage[], // List of profile images
    isLoading: false, // Loading state
  }),

  actions: {
    async uploadProfileImage(file: File, captionText: string): Promise<ImageStoreResponse> {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('captionText', captionText)

      try {
        this.isLoading = true // Set loading state
        const { data } = await safeApiCall(() => api.post<ImageApiResponse>('/image', formData))
        const { success, images } = ImageApiResponseSchema.parse(data)
        this.images = images
        return { success: true }
      } catch (err: unknown) {
        const out: ApiError = {
          success: false,
          message: 'An unexpected error occurred',
        }

        if (err instanceof z.ZodError) {
          // out.message = 'Validation error'
        }

        if (axios.isAxiosError(err) && err.response) {
          const resp = err.response.data as Partial<ApiError>
          out.message = resp.message ?? out.message
          if (resp.fieldErrors) out.fieldErrors = resp.fieldErrors
        } else if (err instanceof Error) {
          out.message = err.message
        }

        return out
      } finally {
        this.isLoading = false // Reset loading state
      }
    },

    async deleteImage(image: OwnerProfileImage): Promise<ImageStoreResponse> {
      try {
        this.isLoading = true // Set loading state
        const { data } = await safeApiCall(() => api.delete<ImageApiResponse>(`/image/${image.id}`))
        const { success, images } = ImageApiResponseSchema.parse(data)
        this.images = images
        return { success: true }
      } catch (error: any) {
        return {
          success: false,
          message: 'An unexpected error occurred',
        }
      } finally {
        this.isLoading = false // Reset loading state
      }
    },

    async reorderImages(imagesForUpdate: ProfileImagePosition[]): Promise<ImageStoreResponse> {
      try {
        this.isLoading = true // Set loading state
        const { data } = await safeApiCall(() =>
          api.patch<ImageApiResponse>('/image/order', { images: imagesForUpdate })
        )
        const { success, images } = ImageApiResponseSchema.parse(data)
        this.images = images
        return { success: true }
      } catch (error: any) {
        this.images = [] // Reset images on error
        return {
          success: false,
          message: 'An unexpected error occurred',
        }
      } finally {
        this.isLoading = false // Reset loading state
      }
    },

    async fetchImages(): Promise<ImageStoreResponse> {
      try {
        this.isLoading = true // Set loading state
        const { data } = await safeApiCall(() => api.get<ImageApiResponse>('/image/me'))
        const { success, images } = ImageApiResponseSchema.parse(data)
        this.images = images
        return { success: true }
      } catch (error: any) {
        console.error('Failed to fetch profile images:', error)
        this.images = [] // Reset images on error
        return {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch profile images',
        }
      } finally {
        this.isLoading = false // Reset loading state
      }
    },

    teardown() {
      this.images = []
    },
  },
})

bus.on('auth:logout', () => {
  useImageStore().teardown()
})
