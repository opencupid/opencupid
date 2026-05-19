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
import type { GalleryStoreResponse } from './galleryStore'

export type UserContentImageStoreParams = { contentId: string } | { draftKey: string }

const storeKey = (params: UserContentImageStoreParams) =>
  'contentId' in params
    ? `userContentImage:${params.contentId}`
    : `userContentImage:draft:${params.draftKey}`

/**
 * Per-content store factory. In "attached" mode (`{ contentId }`) it hits the
 * server-side gallery endpoints. In "draft" mode (`{ draftKey }`) it stages
 * uploads locally so the host EditDialog can submit the imageIds with its
 * create payload. The draft store self-cleans abandoned uploads via
 * `cleanup()` (called by ImageEditor.onUnmounted).
 */
export const useUserContentImageStore = (params: UserContentImageStoreParams) => {
  const isDraft = !('contentId' in params)
  const contentId = 'contentId' in params ? params.contentId : null

  return defineStore(storeKey(params), {
    state: () => ({
      images: [] as OwnerImage[],
      isLoading: false,
      isDraft,
    }),
    actions: {
      async load(): Promise<GalleryStoreResponse> {
        if (this.isDraft) {
          return storeSuccess()
        }
        try {
          this.isLoading = true
          const { data } = await safeApiCall(() =>
            api.get<ImageApiResponse>(`/content/${contentId}/image`)
          )
          const { images } = ImageApiResponseSchema.parse(data)
          this.images = images
          return storeSuccess()
        } catch (err) {
          this.images = []
          return storeError(err, 'Failed to fetch images')
        } finally {
          this.isLoading = false
        }
      },

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

          if (this.isDraft) {
            this.images = [...this.images, created]
            return storeSuccess()
          }

          const { data: attachData } = await safeApiCall(() =>
            api.post<ImageApiResponse>(`/content/${contentId}/image/attach`, {
              imageId: created.id,
            })
          )
          const { images } = ImageApiResponseSchema.parse(attachData)
          this.images = images
          return storeSuccess()
        } catch (err: unknown) {
          if (createdId && !this.isDraft) {
            try {
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
          await safeApiCall(() => api.delete<ImageApiResponse>(`/image/${image.id}`))
          if (this.isDraft) {
            this.images = this.images.filter((i) => i.id !== image.id)
            return storeSuccess()
          }
          return await this.load()
        } catch (err) {
          return storeError(err, 'Failed to delete image')
        } finally {
          this.isLoading = false
        }
      },

      async reorder(items: ImagePosition[]): Promise<GalleryStoreResponse> {
        if (this.isDraft) {
          const byId = new Map(this.images.map((i) => [i.id, i]))
          const reordered = [...items]
            .sort((a, b) => a.position - b.position)
            .map((p) => byId.get(p.id))
            .filter((i): i is OwnerImage => !!i)
          this.images = reordered
          return storeSuccess()
        }
        try {
          this.isLoading = true
          const { data } = await safeApiCall(() =>
            api.patch<ImageApiResponse>(`/content/${contentId}/image/order`, { images: items })
          )
          const { images } = ImageApiResponseSchema.parse(data)
          this.images = images
          return storeSuccess()
        } catch (err) {
          return storeError(err, 'Failed to reorder images')
        } finally {
          this.isLoading = false
        }
      },

      async cleanup(): Promise<GalleryStoreResponse> {
        if (!this.isDraft || this.images.length === 0) return storeSuccess()
        const ids = this.images.map((i) => i.id)
        await Promise.allSettled(ids.map((id) => api.delete(`/image/${id}`)))
        this.images = []
        return storeSuccess()
      },
    },
  })()
}
