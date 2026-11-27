import type { OwnerImage, ImagePosition } from '@zod/image/image.dto'
import type { StoreVoidSuccess, StoreError } from '@/store/helpers'

export type GalleryStoreResponse = StoreVoidSuccess | StoreError

/**
 * Lets the owner limit an image to some viewers. Who those viewers are is the
 * gallery's backend rule; only galleries that define one provide this.
 */
export interface GalleryRestriction {
  /** i18n keys: the upload dialog's checkbox and its hint. */
  labelKey: string
  hintKey: string
  /** i18n key: hover text on a restricted image in the owner's gallery. */
  titleKey: string
  /** False while no viewer can see restricted images (`inactiveTitleKey` explains why). */
  isActive: boolean
  inactiveTitleKey: string
  isRestricted(image: OwnerImage): boolean
}

export interface GalleryStore {
  images: OwnerImage[]
  isLoading: boolean
  restriction?: GalleryRestriction
  load(): Promise<GalleryStoreResponse>
  upload(
    file: File,
    captionText: string,
    opts?: { isRestricted: boolean }
  ): Promise<GalleryStoreResponse>
  remove(image: OwnerImage): Promise<GalleryStoreResponse>
  reorder(items: ImagePosition[]): Promise<GalleryStoreResponse>
  cleanup?(): Promise<GalleryStoreResponse>
}
