import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

/**
 * Viewers whose own profile has no detected face (`hasFace === false`) may not
 * see other profiles' photos; they get a placeholder instead. Their own photos
 * are always visible to them.
 *
 * Reactive: call `canSeePhotosOf` inside a computed or template.
 */
export function useProfilePhotoAccess() {
  const ownerProfileStore = useOwnerProfileStore()

  const canSeePhotosOf = (profile: { id: string }): boolean => {
    const viewer = ownerProfileStore.profile
    return viewer?.hasFace === true || viewer?.id === profile.id
  }

  return { canSeePhotosOf }
}
