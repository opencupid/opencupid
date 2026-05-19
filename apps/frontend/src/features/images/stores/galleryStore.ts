import type { OwnerImage, ImagePosition } from '@zod/image/image.dto'
import type { StoreVoidSuccess, StoreError } from '@/store/helpers'

export type GalleryStoreResponse = StoreVoidSuccess | StoreError

export interface GalleryStore {
  images: OwnerImage[]
  isLoading: boolean
  load(): Promise<GalleryStoreResponse>
  upload(file: File, captionText: string): Promise<GalleryStoreResponse>
  remove(image: OwnerImage): Promise<GalleryStoreResponse>
  reorder(items: ImagePosition[]): Promise<GalleryStoreResponse>
}
