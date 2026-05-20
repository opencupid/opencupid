import { useI18nStore } from '@/store/i18nStore'
import { computed, reactive, shallowRef, toRef, watch } from 'vue'

import { type PublicProfile } from '@zod/profile/profile.dto'
import { type EditFieldProfileFormWithImages } from '@zod/profile/profile.form'

import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

import { type ViewState } from './types'

export function useMyProfileViewModel(isEditMode: boolean) {
  const profileStore = useOwnerProfileStore()
  const formData: EditFieldProfileFormWithImages = reactive({} as EditFieldProfileFormWithImages)

  const viewState = reactive<ViewState>({
    isEditable: isEditMode,
    previewLanguage: useI18nStore().currentLanguage,
    scopes: ['dating', 'social'],
    currentScope: 'social',
  })

  const publicProfile = shallowRef<PublicProfile | null>(null)
  const profilePreview = computed<PublicProfile | null>(() => {
    if (!publicProfile.value) return null
    return {
      ...publicProfile.value,
      isDatingActive: viewState.currentScope === 'dating',
    } as PublicProfile
  })

  const isDatingOnboarded = computed(() => {
    return profileStore.profile?.birthday !== null
  })

  const isOnboarded = computed(() => {
    return profileStore.profile?.isOnboarded ?? false
  })

  const isLoading = computed(() => {
    return profileStore.isLoading
  })

  // actions
  const fetchPreview = async () => {
    if (!profileStore.profile) {
      // error.value = 'Profile not found'
      return
    }
    const res = await profileStore.getProfilePreview(
      profileStore.profile.id,
      viewState.previewLanguage
    )
    if (!res.success) {
      return res
    }
    if (!res.data) return
    publicProfile.value = res.data
  }

  const updateScopes = async (payload: { isDatingActive: boolean }) => {
    await profileStore.updateProfileScopes(payload)
  }

  const updateProfile = async () => {
    const res = await profileStore.updateOwnerProfile(formData)
    if (res.success) fetchPreview()
    return res
  }

  // Re-sync formData whenever the profile reference is replaced (fetchOwnerProfile,
  // createOwnerProfile, persistOwnerProfile all assign a new object). updateOwnerProfile
  // mutates in place so it does not trigger this watcher, which is correct — the form
  // is the authoritative source while the user is editing.
  watch(
    () => profileStore.profile,
    (profile) => {
      if (!profile) return
      Object.assign(formData, profile)
      fetchPreview()
      profileStore.fetchDatingPrefs()
    },
    { immediate: true }
  )

  // Re-fetch preview only when user switches the preview language
  watch(
    () => viewState.previewLanguage,
    () => fetchPreview()
  )

  // switch to dating scope when editable is turned on,
  // in order to show all of the fields
  watch(
    () => viewState.isEditable,
    () => {
      if (profileStore.profile?.isDatingActive) viewState.currentScope = 'dating'
    },
    {}
  )

  watch(
    () => formData.isDatingActive,
    (active) => {
      viewState.currentScope = active ? 'dating' : 'social'
    }
  )

  return {
    error: computed(() => profileStore.error),
    isLoading,
    viewState,
    formData,
    publicProfile,
    profilePreview,
    isDatingOnboarded,
    isOnboarded,
    datingPrefs: toRef(profileStore, 'datingPrefs'),
    updateScopes,
    updateProfile,
    persistDatingPrefs: () => profileStore.persistDatingPrefs(),
  }
}
