<script setup lang="ts">
import { useRouter } from 'vue-router'
import { onMounted, ref, provide } from 'vue'
import { useBootstrap } from '@/lib/bootstrap'

import IconDate from '@/assets/icons/app/cupid.svg'
import IconSocialize from '@/assets/icons/app/socialize.svg'

import StoreErrorOverlay from '@/features/shared/ui/StoreErrorOverlay.vue'
import EditButton from '@/features/myprofile/components/EditButton.vue'
import ProfileContent from '@/features/publicprofile/components/ProfileContent.vue'

import { useMyProfileViewModel } from '../composables/useMyProfileViewModel'
import DatingWizard from '../../onboarding/components/DatingWizard.vue'
import MyProfileSecondaryNav from '../components/MyProfileSecondaryNav.vue'
import EditableFields from '../components/EditableFields.vue'

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
  updateScopes,
  updateProfile,
} = useMyProfileViewModel(props.editMode)

const isDatingWizardActive = ref(false)
const toggleDating = async () => {
  // If dating is not onboarded, show the wizard
  if (!isDatingOnboarded.value && !formData.isDatingActive) {
    isDatingWizardActive.value = true
    return
  }
  formData.isDatingActive = !formData.isDatingActive
  await updateScopes()
}

const toggleSocial = async () => {
  formData.isSocialActive = !formData.isSocialActive
  await updateScopes()
}

const handleFinishEdit = async () => {
  const res = await updateProfile()
  formData.isDatingActive = true
  await updateScopes()
  if (res.success) {
    isDatingWizardActive.value = false
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
provide('viewerProfile', formData)
</script>

<template>
  <main class="w-100" :class="[viewState.currentScope, { editable: viewState.isEditable }]">
    <EditableFields v-model="formData" :editState="viewState.isEditable" @updated="updateProfile">
      <StoreErrorOverlay v-if="error" :error />
      <div v-else class="d-flex flex-column justify-content-center h-100">
        <div class="col-12 col-sm-8 mx-auto position-relative">
          <div class="d-flex flex-row justify-content-between align-items-center my-2">
            <div
              style="height: 3rem"
              class="w-100 d-flex align-items-center justify-content-center"
            >
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
        </div>
        <div class="overflow-auto h-100">
          <div class="col-12 col-sm-8 mx-auto position-relative h-100">
            <ProfileContent
              v-if="profilePreview"
              :isLoading="isLoading"
              @intent:field:edit="showModal = true"
              class="shadow-lg"
              :profile="profilePreview"
            />
          </div>
        </div>
      </div>
      <div class="main-edit-button">
        <EditButton v-model="viewState.isEditable" />
      </div>
    </EditableFields>
    <BModal
      title=""
      v-if="isDatingWizardActive"
      :backdrop="'static'"
      centered
      size="lg"
      button-size="sm"
      fullscreen="sm"
      :focus="false"
      :no-close-on-backdrop="true"
      :no-header="true"
      :no-footer="true"
      :show="true"
      body-class="d-flex flex-column align-items-center justify-content-center overflow-hidden p-5"
      :keyboard="false"
    >
      <DatingWizard v-model="formData" @finished="handleFinishEdit" @cancel="handleCancelEdit" />
    </BModal>
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
