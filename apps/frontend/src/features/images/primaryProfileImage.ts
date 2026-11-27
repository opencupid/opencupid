/**
 * A profile's primary photo: the first one that is not restricted, or none when
 * every photo is. The owner's gallery and the galleries served to eligible
 * viewers flag restricted photos; this gives the photo everyone sees as the
 * primary in each case, so a restricted photo is never an avatar.
 */
export function primaryProfileImage<T extends { isRestricted?: boolean }>(
  images: readonly T[] | undefined
): T | undefined {
  return images?.find((image) => !image.isRestricted)
}
