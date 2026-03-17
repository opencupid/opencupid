import { useI18nStore } from '@/store/i18nStore'
import { computed, reactive, toRef, watch } from 'vue'
import { whenever } from '@vueuse/core'

import { type PublicProfileWithContext } from '@zod/profile/profile.dto'
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

  // computed properties
  const publicProfile = reactive({} as PublicProfileWithContext)
  const profilePreview = computed((): PublicProfileWithContext => {
    return {
      ...publicProfile,
      isDatingActive: viewState.currentScope === 'dating',
    } as PublicProfileWithContext
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
    Object.assign(publicProfile, res.data)
  }

  const updateScopes = async (payload: { isDatingActive: boolean }) => {
    await profileStore.updateProfileScopes(payload)
  }

  const updateProfile = async () => {
    const res = await profileStore.updateOwnerProfile(formData)
    if (res.success) fetchPreview()
    return res
  }

  // Initialize form data and fetch preview/dating-prefs once when profile is available.
  // whenever() only fires when the source is truthy, so it safely waits for bootstrap
  // to load the profile on deep-links, then runs exactly once.
  whenever(
    () => profileStore.profile,
    (profile) => {
      Object.assign(formData, profile)
      fetchPreview()
      profileStore.fetchDatingPrefs()
    },
    { immediate: true, once: true }
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
