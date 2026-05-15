import { defineStore } from 'pinia'
import { api, axios, safeApiCall } from '@/lib/api'
import type { ApiError, ApiSuccess } from '@zod/apiResponse.dto'
import {
  type ImageApiResponse,
  ImageApiResponseSchema,
  type OwnerProfileImage,
  type ProfileImagePosition,
} from '@zod/profile/profileimage.dto'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { bus } from '@/lib/bus'

type ImageStoreResponse = ApiSuccess<{}> | ApiError

function profileScopedPath(profileId: string, segment = ''): string {
  return `/image/profile/${profileId}${segment}`
}

function currentProfileId(): string | null {
  return useOwnerProfileStore().profile?.id ?? null
}

export const useImageStore = defineStore('image', {
  state: () => ({
    images: [] as OwnerProfileImage[],
    isLoading: false,
  }),

  actions: {
    async uploadProfileImage(file: File, captionText: string): Promise<ImageStoreResponse> {
      const profileId = currentProfileId()
      if (!profileId) return { success: false, message: 'No profile in session' }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('captionText', captionText)

      try {
        this.isLoading = true
        const { data } = await safeApiCall(() =>
          api.post<ImageApiResponse>(profileScopedPath(profileId), formData)
        )
        const { images } = ImageApiResponseSchema.parse(data)
        this.images = images
        return { success: true }
      } catch (err: unknown) {
        const out: ApiError = {
          success: false,
          message: 'An unexpected error occurred',
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
        this.isLoading = false
      }
    },

    async deleteImage(image: OwnerProfileImage): Promise<ImageStoreResponse> {
      const profileId = currentProfileId()
      if (!profileId) return { success: false, message: 'No profile in session' }

      try {
        this.isLoading = true
        const { data } = await safeApiCall(() =>
          api.delete<ImageApiResponse>(profileScopedPath(profileId, `/${image.id}`))
        )
        const { images } = ImageApiResponseSchema.parse(data)
        this.images = images
        return { success: true }
      } catch (error: any) {
        return {
          success: false,
          message: 'An unexpected error occurred',
        }
      } finally {
        this.isLoading = false
      }
    },

    async reorderImages(imagesForUpdate: ProfileImagePosition[]): Promise<ImageStoreResponse> {
      const profileId = currentProfileId()
      if (!profileId) return { success: false, message: 'No profile in session' }

      try {
        this.isLoading = true
        const { data } = await safeApiCall(() =>
          api.patch<ImageApiResponse>(profileScopedPath(profileId, '/order'), {
            images: imagesForUpdate,
          })
        )
        const { images } = ImageApiResponseSchema.parse(data)
        this.images = images
        return { success: true }
      } catch (error: any) {
        this.images = []
        return {
          success: false,
          message: 'An unexpected error occurred',
        }
      } finally {
        this.isLoading = false
      }
    },

    async fetchImages(): Promise<ImageStoreResponse> {
      const profileId = currentProfileId()
      if (!profileId) return { success: false, message: 'No profile in session' }

      try {
        this.isLoading = true
        const { data } = await safeApiCall(() =>
          api.get<ImageApiResponse>(profileScopedPath(profileId))
        )
        const { images } = ImageApiResponseSchema.parse(data)
        this.images = images
        return { success: true }
      } catch (error: any) {
        console.error('Failed to fetch profile images:', error)
        this.images = []
        return {
          success: false,
          message: error?.response?.data?.message ?? 'Failed to fetch profile images',
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

bus.on('auth:logout', () => {
  useImageStore().teardown()
})
