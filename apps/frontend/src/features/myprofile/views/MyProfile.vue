<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { onMounted, ref, provide, computed, toRef } from 'vue'
import { useBootstrap } from '@/lib/bootstrap'

import StoreErrorOverlay from '@/features/shared/ui/StoreErrorOverlay.vue'
import EditButton from '@/features/myprofile/components/EditButton.vue'
import ProfileContent from '@/features/publicprofile/components/ProfileContent.vue'

import { useMyProfileViewModel } from '../composables/useMyProfileViewModel'
import DatingWizard from '../../onboarding/components/DatingWizard.vue'
import MyProfileSecondaryNav from '../components/MyProfileSecondaryNav.vue'
import EditableFields from '../components/EditableFields.vue'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'

import IconCupid from '@/assets/images/app/cupid.svg'

const router = useRouter()

const props = defineProps<{
  editMode?: boolean
}>()

const showModal = ref(false)
const {
  error,
  isLoading,
  viewState,
  formData,
  profilePreview,
  isDatingOnboarded,
  isOnboarded,
  datingPrefs,
  updateScopes,
  updateProfile,
  persistDatingPrefs,
} = useMyProfileViewModel(props.editMode)

const isDatingWizardActive = ref(false)
const openDatingPrefs = () => {
  if (!isDatingOnboarded.value) {
    router.push({ name: 'DatingWizard' })
    return
  }
  router.push({ name: 'DatingPrefs' })
}

const openDatingProfile = () => {
  if (!isDatingOnboarded.value) {
    router.push({ name: 'DatingWizard' })
    return
  }
  router.push({ name: 'DatingPrefs' })
}

const toggleDating = async () => {
  // If dating is not onboarded, navigate to the intro view
  if (!isDatingOnboarded.value && !formData.isDatingActive) {
    router.push({ name: 'DatingWizard' })
    return
  }
  const newValue = !formData.isDatingActive
  formData.isDatingActive = newValue
  await updateScopes({ isDatingActive: newValue })
}

const handleFinishDatingOnboarding = async () => {
  const res = await updateProfile()
  await persistDatingPrefs()
  await updateScopes({ isDatingActive: true })
  if (res.success) {
    isDatingWizardActive.value = false
    router.push({ name: 'BrowseProfiles' })
  }
}

const handleCancelEdit = () => {
  isDatingWizardActive.value = false
}

onMounted(async () => {
  await useBootstrap().bootstrap()
  if (!isOnboarded.value) {
    router.push({ name: 'Onboarding' })
    return
  }
})

provide('isOwner', true)
provide('viewerProfile', toRef(formData))

const route = useRoute()
const hint = computed(() => history?.state?.hint || null)
</script>

<template>
  <main
    class="w-100 position-relative overflow-hidden"
    :class="[viewState.currentScope, { editable: viewState.isEditable }]"
  >
    <EditableFields
      v-model="formData"
      :editState="viewState.isEditable"
      @updated="updateProfile"
    >
      <StoreErrorOverlay
        v-if="error"
        :error
      />
      <div
        v-else
        class="d-flex flex-column justify-content-center h-100"
      >
        <MiddleColumn class="pt-sm-3 position-relative">
          <div class="d-flex flex-row justify-content-between align-items-center">
            <MyProfileSecondaryNav
              v-model="viewState"
              v-model:isDatingActive="formData.isDatingActive"
              :is-dating-onboarded="isDatingOnboarded"
              @datingmode:toggle="toggleDating"
              @datingmode:prefs="openDatingPrefs"
              @datingmode:profile="openDatingProfile"
            />
          </div>
        </MiddleColumn>
        <div class="overflow-auto hide-scrollbar h-100">
          <MiddleColumn
            class="pt-sm-3 position-relative flex-grow-1"
            style="min-height: 100%"
          >
            <ProfileContent
              v-if="profilePreview"
              :isLoading="isLoading"
              @intent:field:edit="showModal = true"
              class="shadow-lg"
              :profile="profilePreview"
            />
          </MiddleColumn>
        </div>
      </div>
      <div class="main-edit-button">
        <EditButton v-model="viewState.isEditable" />
      </div>
    </EditableFields>
    <BModal
      v-model="isDatingWizardActive"
      :backdrop="'static'"
      centered
      size="lg"
      button-size="sm"
      fullscreen="sm"
      :focus="false"
      :no-close-on-backdrop="true"
      :no-header="false"
      :title="$t('onboarding.wizard.dating_modal_title')"
      variant="light-subtle"
      :no-footer="true"
      body-class="d-flex flex-column align-items-center justify-content-center overflow-auto hide-scrollbar p-2 p-md-5"
      content-class="overflow-clipped"
      :keyboard="false"
      lazy
    >
      <DatingWizard
        v-model="formData"
        v-model:datingPrefs="datingPrefs"
        @finished="handleFinishDatingOnboarding"
        @cancel="handleCancelEdit"
      >
        <div
          class="col-6 mx-auto d-flex align-items-center justify-content-center text-dating mb-2 mb-md-4 animate__animated animate__fadeIn"
        >
          <IconCupid class="svg-icon-100 opacity-50" />
        </div>
        <!-- <legend>
            {{ t('onboarding.dating_mode_step_title') }}
          </legend> -->
        <div class="mb-3 d-flex flex-column align-items-center">
          <BFormCheckbox
            v-model="formData.isDatingActive"
            switch
            size="lg"
          >
            {{ $t('onboarding.dating_mode_switch') }}
          </BFormCheckbox>

          <p class="text-muted text-center">
            <span v-if="formData.isDatingActive">
              {{ $t('onboarding.dating_mode_step_hint_active') }}
            </span>
            <span v-else>
              {{ $t('onboarding.dating_mode_step_hint_inactive') }}
            </span>
          </p>
        </div>
      </DatingWizard>
    </BModal>
  </main>
</template>

<style scoped lang="scss">
@import '@/css/theme.scss';

.toggle-bar {
  height: 3rem;
}

.editable {
  background-color: var(--bs-light);
}

:deep(.editable-textarea) {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch !important;
  width: 100%;
}

:deep(.editable-textarea .edit-button) {
  position: absolute;
  right: -0.25rem;
  bottom: 0.25rem;
}

:deep(.editable-textarea .editable-placeholder) {
  display: flex;
  padding: 0.25rem;
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

.editable :deep(.dating-field) {
  background-color: transparentize($dating, 0.9);
  box-shadow: 0 0 10px 10px transparentize($dating, 0.9);
}

:deep(.editable-field) {
  display: inline-flex;
  align-items: center;
}
</style>
