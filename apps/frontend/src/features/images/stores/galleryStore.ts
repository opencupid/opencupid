import type { OwnerImage, ImagePosition } from '@zod/image/image.dto'
import type { ApiSuccess, ApiError } from '@zod/apiResponse.dto'

export type GalleryStoreResponse = ApiSuccess<{}> | ApiError

export interface GalleryStore {
  images: OwnerImage[]
  isLoading: boolean
  load(): Promise<GalleryStoreResponse>
  upload(file: File, captionText: string): Promise<GalleryStoreResponse>
  remove(image: OwnerImage): Promise<GalleryStoreResponse>
  reorder(items: ImagePosition[]): Promise<GalleryStoreResponse>
}
