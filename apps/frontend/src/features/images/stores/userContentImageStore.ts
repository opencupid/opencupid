import { defineStore } from 'pinia'
import { api, axios, safeApiCall } from '@/lib/api'
import type { ApiError } from '@zod/apiResponse.dto'
import {
  type ImageApiResponse,
  ImageApiResponseSchema,
  type OwnerImage,
  type ImagePosition,
} from '@zod/image/image.dto'
import type { GalleryStoreResponse } from './galleryStore'

/**
 * Per-content store factory. Each UserContent gallery gets its own store instance
 * keyed by contentId. Multiple instances may coexist (one per editor mount).
 */
export const useUserContentImageStore = (contentId: string) =>
  defineStore(`userContentImage:${contentId}`, {
    state: () => ({
      images: [] as OwnerImage[],
      isLoading: false,
    }),
    actions: {
      async load(): Promise<GalleryStoreResponse> {
        try {
          this.isLoading = true
          const { data } = await safeApiCall(() =>
            api.get<ImageApiResponse>(`/content/${contentId}/image`)
          )
          const { images } = ImageApiResponseSchema.parse(data)
          this.images = images
          return { success: true }
        } catch (err: any) {
          this.images = []
          return {
            success: false,
            message: err.response?.data?.message || 'Failed to fetch images',
          }
        } finally {
          this.isLoading = false
        }
      },

      async upload(file: File, captionText: string): Promise<GalleryStoreResponse> {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('captionText', captionText)
        try {
          this.isLoading = true
          const { data } = await safeApiCall(() =>
            api.post<ImageApiResponse>(`/content/${contentId}/image`, formData)
          )
          const { images } = ImageApiResponseSchema.parse(data)
          this.images = images
          return { success: true }
        } catch (err: unknown) {
          const out: ApiError = { success: false, message: 'An unexpected error occurred' }
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

      async remove(image: OwnerImage): Promise<GalleryStoreResponse> {
        // DELETE goes through the unified /image/:id endpoint.
        try {
          this.isLoading = true
          await safeApiCall(() => api.delete<ImageApiResponse>(`/image/${image.id}`))
          // Re-fetch to refresh local state (delete response from /image/:id is for the
          // profile gallery; for content galleries we re-read the content's gallery).
          return await this.load()
        } catch {
          return { success: false, message: 'Failed to delete image' }
        } finally {
          this.isLoading = false
        }
      },

      async reorder(items: ImagePosition[]): Promise<GalleryStoreResponse> {
        try {
          this.isLoading = true
          const { data } = await safeApiCall(() =>
            api.patch<ImageApiResponse>(`/content/${contentId}/image/order`, { images: items })
          )
          const { images } = ImageApiResponseSchema.parse(data)
          this.images = images
          return { success: true }
        } catch {
          return { success: false, message: 'Failed to reorder' }
        } finally {
          this.isLoading = false
        }
      },
    },
  })()
