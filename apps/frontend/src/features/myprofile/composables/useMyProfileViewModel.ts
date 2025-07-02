import { useI18nStore } from "@/store/i18nStore"
import { computed, reactive, ref, watch } from "vue"

import { type PublicProfileWithContext } from "@zod/profile/profile.dto"
import { type EditFieldProfileFormWithImages } from "@zod/profile/profile.form"

import { useOwnerProfileStore } from "@/features/myprofile/stores/ownerProfileStore"

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
    // console.log('Checking if dating is onboarded:', profileStore.profile?.birthday)
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

  const updateScopes = async () => {
    const res = await profileStore.updateProfileScopes({
      isDatingActive: formData.isDatingActive,
      isSocialActive: formData.isSocialActive,
    })
  }

  const updateProfile = async () => {
    const res = await profileStore.updateOwnerProfile(formData)
    return res
  }

  watch(
    [() => viewState.previewLanguage, () => profileStore.profile],
    () => {
      // Object.assign(formData, profileStore.profile)
      fetchPreview()
    },
    {immediate: true}
  )

  watch(
    () => profileStore.profile,
    () => {
      Object.assign(formData, profileStore.profile)
    },
    {immediate: true}
  )

  // switch to dating scope when editable is turned on,
  // in order to show all of the fields
  watch(
    () => viewState.isEditable,
    () => {
      if (viewState.scopes.includes('dating'))
        viewState.currentScope = 'dating'
    },
    {}
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
    updateScopes,
    updateProfile,
  }

}