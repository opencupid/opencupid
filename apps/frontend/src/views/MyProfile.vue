<script setup lang="ts">
import { reactive, onMounted, ref, provide, watch, computed, watchEffect, toRef } from 'vue'
import { useProfileStore } from '@/store/profileStore'

import PublicProfileComponent from '@/components/profiles/public/PublicProfileComponent.vue'
import { type EditFieldProfileFormWithImages } from '@zod/profile/profile.form'
import IconDate from '@/assets/icons/app/cupid.svg'
import IconSocialize from '@/assets/icons/app/socialize.svg'
import IconPencil2 from '@/assets/icons/interface/pencil-2.svg'
import IconGlobe from '@/assets/icons/interface/globe.svg'
import IconTick from '@/assets/icons/interface/tick.svg'

import { useOnboardingWizard } from '@/components/profiles/onboarding/useProfileWizards'
import { useStepper } from '@vueuse/core'
import { useRouter } from 'vue-router'
import ErrorOverlay from '@/components/ErrorOverlay.vue'
import { type PublicProfileWithContext } from '@zod/profile/profile.dto'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import ScopeViewToggler from '@/components/profiles/ScopeViewToggler.vue'
import EditButton from '@/components/profiles/myprofile/EditButton.vue'

import { useI18nStore } from '@/store/i18nStore'
import MyProfileSecondaryNav from '../components/profiles/myprofile/MyProfileSecondaryNav.vue'
import { type ViewState } from '@/components/profiles/myprofile/types'

const router = useRouter()
const profileStore = useProfileStore()

const showModal = ref(false)
const error = ref('')
const formData: EditFieldProfileFormWithImages = reactive({} as EditFieldProfileFormWithImages)

const viewState = reactive<ViewState>({
  isEditable: false,
  previewLanguage: useI18nStore().currentLanguage,
  scopes: ['dating', 'social'],
  currentScope: 'social',
})

const publicProfile = reactive({} as PublicProfileWithContext)
const profilePreview = computed((): PublicProfileWithContext => {
  return {
    ...publicProfile,
    isDatingActive: viewState.currentScope === 'dating',
  } as PublicProfileWithContext
})

const fetchProfilePreview = async () => {
  if (!profileStore.profile) {
    error.value = 'Profile not found'
    return
  }
  const res = await profileStore.getProfilePreview(
    profileStore.profile.id,
    viewState.previewLanguage
  )
  if (!res.success || !res.data) {
    error.value = 'Something went wrong (public profile)'
    return
  }
  console.log('Public profile fetched:', res.data)
  Object.assign(publicProfile, res.data)
}

onMounted(async () => {
  await profileStore.fetchOwnerProfile()
  // console.log('Profile fetched:', profileStore.profile)
  if (!profileStore.profile) {
    error.value = 'Something went wrong (owner profile)'
    return
  }
  if (!profileStore.profile.isOnboarded) {
    router.push({ name: 'Onboarding' })
    return
  }
  Object.assign(formData, profileStore.profile)
  await fetchProfilePreview()
})

watch(
  () => viewState.previewLanguage,
  () => {
    fetchProfilePreview()
  },
  {
    deep: true,
  }
)
provide('isOwner', true)
provide('isEditable', toRef(viewState, 'isEditable'))
provide('editableModel', formData)

const toggleSocial = async () => {
  // if (!profileStore.profile) return
  formData.isSocialActive = !formData.isSocialActive
  const res = await profileStore.updateOwnerProfile(formData)
}

const datingPopup = ref(false)
const toggleDating = async () => {
  // if (!profileStore.profile) return
  formData.isDatingActive = !formData.isDatingActive
  if (formData.isDatingActive && !formData.birthday) {
    datingPopup.value = true
    profileStore.currentField = null
    profileStore.open()
    return
  }
  const res = await profileStore.updateOwnerProfile(formData)
}

const handleOkClick = async () => {
  console.log('Dating popup OK clicked formData', formData)
  const res = await profileStore.updateOwnerProfile(formData)
  if (res.success) {
    await fetchProfilePreview()
    // profileStore.close()
  } else {
    console.error('Failed to fetch updated profile after edit.')
  }
}

const handleCancelClick = () => {
  console.log('Dating popup cancelled')
  profileStore.currentField = null
  datingPopup.value = false
  // this handles the case where the user cancels the dating popup
  // and the birthday is not set
  if (formData.isDatingActive && !profileStore.profile?.birthday) {
    formData.isDatingActive = false
  }
}

const { datingWizard } = useOnboardingWizard(formData)
const { current, isFirst, goToNext, goToPrevious, goTo, isCurrent } = useStepper(datingWizard)

// const saveProfile = async () => {
//   const res = await profileStore.createOwnerProfile(formData)
//   if (!res.success) {
//     console.error('Failed to save profile:', res.message)
//     error.value = res.message || 'Failed to save profile'
//     return
//   }
//   console.log('Profile saved:', formData)
// }

// const handleNext = async () => {
//   if (current.value) {
//     current.value.isCompleted = true
//     if (current.value.flags === 'stage_one_end') {
//       console.log('Stage completed:', current.value.state)
//       if (formData.isDatingActive) {
//         goToNext()
//       } else {
//         isComplete.value = true
//         goTo('confirm')
//         await saveProfile()
//       }
//     }
//     if (current.value.flags === 'stage_two_end') {
//       isComplete.value = true
//       goTo('confirm')
//       await saveProfile()
//       console.log('Stage completed:', current.value.state)
//     }
//     if (current.value.state) {
//       goToNext()
//     } else {
//       console.warn('Current step is not valid')
//     }
//   } else {
//     console.warn('No current step found')
//   }
// }

const update = (value: EditFieldProfileFormWithImages) => {}
</script>

<template>
  <main class="container" :class="[viewState.currentScope, {editable: viewState.isEditable}]">
    <ErrorOverlay v-if="error" :error />
    <div v-else class="row justify-content-center mt-3">
      <div class="col-12 col-md-8 col-lg-6 position-relative user-select-none">
        <div class="d-flex flex-row justify-content-between align-items-center mb-2">
          <div style="height: 3rem" class="w-100">
            <div v-if="viewState.isEditable" class="d-flex">
              <span
                class="btn-social-toggle px-4 py-1 rounded-4 me-2"
                @click="toggleSocial"
                :class="{ active: formData.isSocialActive }"
              >
                <IconSocialize class="svg-icon-lg" />
              </span>
              <span
                class="btn-dating-toggle px-4 py-1 rounded-4"
                @click="toggleDating"
                :class="{ active: formData.isDatingActive }"
              >
                <IconDate class="svg-icon-lg" />
              </span>
            </div>
            <div v-else>
              <MyProfileSecondaryNav v-model="viewState" />
            </div>
          </div>
        </div>
        <div class="main-edit-button">
          <EditButton v-model="viewState" />
        </div>
        <PublicProfileComponent
          v-if="profilePreview"
          :isLoading="profileStore.isLoading"
          @intent:field:edit="showModal = true"
          :profile="profilePreview"
        />
      </div>
    </div>
    <BModal
      v-model="profileStore.fieldEditModal"
      title=""
      :backdrop="'static'"
      centered
      size="lg"
      button-size="sm"
      fullscreen="sm"
      :focus="false"
      :no-close-on-backdrop="true"
      :no-header="true"
      :ok-title="'OK'"
      :ok-class="'btn btn-primary px-5'"
      cancel-title="Nevermind"
      :initial-animation="false"
      body-class="d-flex flex-row align-items-center justify-content-center overflow-hidden"
      @ok="handleOkClick"
      @cancel="handleCancelClick"
      @close="profileStore.fieldEditModal = false"
      :keyboard="false"
    >
      <template #cancel="{ close }">
        <a href="#" @click="close" class="link-underline link-underline-opacity-0 me-4"
          >Nevermind</a
        >
      </template>
      <div id="field-edit-modal" class="w-100 py-5"></div>
    </BModal>
    <Teleport to="#field-edit-modal" v-if="datingPopup">
      <DatingWizard v-model="formData" @update:modelValue="update"></DatingWizard>
      <!-- <div>
        <DatingSteps v-model="formData" :isCurrent />
        <fieldset v-if="isCurrent('confirm')">Cool!</fieldset>
      </div>
      <BButton
        @click="handleNext"
        :disabled="!current.state"
        v-if="!isComplete"
        variant="primary"
        size="lg"
        pill
        >Next</BButton
      > -->
    </Teleport>
  </main>
</template>

<style scoped lang="scss">


@import '@/css/theme.scss';

.main-edit-button {
  position: fixed;
  z-index: 5;
  bottom: 1rem;
  right: 1rem;
}

.editable {
  background-color: var(--bs-light);
}
.dating {
  background-color: transparentize($dating,0.9);
}
.social {
  background-color: transparentize($social,0.9);
}

:deep(.editable-textarea) {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  :deep(.editable-placeholder) {
    height: 4rem;
  }
}

:deep(.editable-textarea .edit-button) {
  position: absolute;
  right: 0;
  bottom: 0.5rem;
}
:deep(.editable-placeholder + .edit-button) {
  position: absolute;
  right: 0;
  bottom: 0.25rem;
}

:deep(.editable-placeholder) {
  border: 2px dashed var(--bs-secondary);
  border-radius: 5px;
  opacity: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

:deep(.editable .dating-field .editable-placeholder) {
  background-color: var(--bs-dating-light);
}
:deep(.editable-field) {
  position: relative;
  display: inline-flex;
  flex-direction: column;
}
</style>
