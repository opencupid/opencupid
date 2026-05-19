import { defineStore } from 'pinia'
import { api, safeApiCall } from '@/lib/api'
import {
  type ImageApiResponse,
  ImageApiResponseSchema,
  type ImageResponse,
  ImageResponseSchema,
  type OwnerImage,
  type ImagePosition,
} from '@zod/image/image.dto'
import { storeSuccess, storeError } from '@/store/helpers'
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
      this.isLoading = true
      let createdId: string | null = null
      try {
        const { data: createData } = await safeApiCall(() =>
          api.post<ImageResponse>('/image', formData)
        )
        const created = ImageResponseSchema.parse(createData).image
        createdId = created.id

        const { data: attachData } = await safeApiCall(() =>
          api.post<ImageApiResponse>('/image/me/attach', { imageId: created.id })
        )
        const { images } = ImageApiResponseSchema.parse(attachData)
        this.images = images
        return storeSuccess()
      } catch (err: unknown) {
        if (createdId) {
          try {
            // best-effort cleanup; intentionally bypasses safeApiCall — failures here are
            // already in a failure path and would mask the original error
            await api.delete(`/image/${createdId}`)
          } catch {
            // swallow
          }
        }
        return storeError(err, 'Failed to upload image')
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
        return storeSuccess()
      } catch (err) {
        return storeError(err, 'Failed to delete image')
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
        return storeSuccess()
      } catch (err) {
        this.images = []
        return storeError(err, 'Failed to reorder images')
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
        return storeSuccess()
      } catch (err) {
        this.images = []
        return storeError(err, 'Failed to fetch profile images')
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
  useProfileImageStore().teardown()
})
