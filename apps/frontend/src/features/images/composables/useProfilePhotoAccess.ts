import { computed } from 'vue'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

/**
 * Viewers whose own profile has no detected face (`hasFace === false`) may not
 * see other profiles' photos; they get a placeholder instead. Their own photos
 * are always visible to them.
 *
 * Reactive: call `canSeePhotosOf` inside a computed or template, or depend on
 * `canSeeOthersPhotos` when the access check runs outside a reactive context
 * (e.g. a function handed to a non-Vue renderer).
 */
export function useProfilePhotoAccess() {
  const ownerProfileStore = useOwnerProfileStore()

  const canSeeOthersPhotos = computed(() => ownerProfileStore.profile?.hasFace === true)

  const canSeePhotosOf = (profile: { id: string }): boolean =>
    canSeeOthersPhotos.value || ownerProfileStore.profile?.id === profile.id

  return { canSeeOthersPhotos, canSeePhotosOf }
}
