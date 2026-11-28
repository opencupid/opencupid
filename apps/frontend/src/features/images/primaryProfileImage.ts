/**
 * A profile's primary photo. Only the owner's own gallery flags restricted
 * photos, and the owner's avatar skips them (none when every photo is
 * restricted). Galleries served to other viewers carry no flag; the backend has
 * already dropped what that viewer may not see, so their first photo is the
 * primary, restricted or not.
 */
export function primaryProfileImage<T extends { isRestricted?: boolean }>(
  images: readonly T[] | undefined
): T | undefined {
  return images?.find((image) => !image.isRestricted)
}
