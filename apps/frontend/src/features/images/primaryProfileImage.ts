/**
 * A profile's primary photo: the first one that is not restricted. Galleries
 * served to other viewers are already filtered and put the primary first; the
 * owner's own gallery is in stored order and flags restricted photos, so this
 * gives the photo everyone else sees as the primary in both cases.
 */
export function primaryProfileImage<T extends { isRestricted?: boolean }>(
  images: readonly T[] | undefined
): T | undefined {
  return images?.find((image) => !image.isRestricted)
}
