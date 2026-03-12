<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { onMounted, ref, provide, computed, toRef } from 'vue'
import { useBootstrap } from '@/lib/bootstrap'

import IconDate from '@/assets/images/app/cupid.svg'
import IconSocialize from '@/assets/images/app/socialize.svg'

import StoreErrorOverlay from '@/features/shared/ui/StoreErrorOverlay.vue'
import EditButton from '@/features/myprofile/components/EditButton.vue'
import ProfileContent from '@/features/publicprofile/components/ProfileContent.vue'

import { useMyProfileViewModel } from '../composables/useMyProfileViewModel'
import DatingWizard from '../../onboarding/components/DatingWizard.vue'
import EditDatingProfile from '../components/EditDatingProfile.vue'
import DatingPreferencesForm from '@/features/browse/components/DatingPreferencesForm.vue'
import MyProfileSecondaryNav from '../components/MyProfileSecondaryNav.vue'
import EditableFields from '../components/EditableFields.vue'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'

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
const showDatingPrefsModal = ref(false)
const showDatingProfileModal = ref(false)
const openDatingPrefs = () => {
  showDatingPrefsModal.value = true
}

const toggleDating = async () => {
  // If dating is not onboarded, show the wizard
  if (!isDatingOnboarded.value && !formData.isDatingActive) {
    isDatingWizardActive.value = true
    return
  }
  const newValue = !formData.isDatingActive
  formData.isDatingActive = newValue
  await updateScopes({ isDatingActive: newValue })
}

const handleFinishDatingOnboarding = async () => {
  const res = await updateProfile()
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
              @datingmode:profile="showDatingProfileModal = true"
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
      body-class="d-flex flex-column align-items-center justify-content-center overflow-auto hide-scrollbar p-2 p-md-5"
      :keyboard="false"
    >
      <DatingWizard
        v-model="formData"
        @finished="handleFinishDatingOnboarding"
        @cancel="handleCancelEdit"
      />
    </BModal>
    <BModal
      v-model="showDatingPrefsModal"
      centered
      button-size="sm"
      :focus="false"
      :no-close-on-backdrop="true"
      size="lg"
      fullscreen="sm"
      :no-footer="false"
      :no-header="false"
      :cancel-title="$t('profiles.browse.filters.dialog_cancel_button')"
      cancel-variant="link"
      :ok-title="$t('profiles.browse.filters.button_update_prefs')"
      initial-animation
      :body-scrolling="false"
      @ok="persistDatingPrefs"
    >
      <DatingPreferencesForm
        v-model="datingPrefs"
        v-if="datingPrefs"
      />
    </BModal>
    <BModal
      v-if="showDatingProfileModal"
      :backdrop="'static'"
      centered
      size="lg"
      button-size="sm"
      fullscreen="sm"
      :focus="false"
      :no-close-on-backdrop="true"
      :no-header="false"
      :title="$t('profiles.forms.my_dating_profile')"
      :no-footer="true"
      :show="true"
      body-class="d-flex flex-column align-items-center justify-content-center overflow-auto hide-scrollbar p-2 p-md-5"
      :keyboard="false"
    >
      <EditDatingProfile
        v-model="formData"
        @save="updateProfile().then(() => (showDatingProfileModal = false))"
        @cancel="showDatingProfileModal = false"
      />
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
  :deep(.editable-placeholder) {
    height: 4rem;
  }
}

:deep(.editable-textarea .edit-button) {
  position: absolute;
  right: 0;
  bottom: 0.5rem;
}
:deep(.editable-textarea .editable-placeholder) {
  display: flex;
  padding: 0.25rem;
}
:deep(.editable-textarea .editable-placeholder + .edit-button) {
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
  display: inline-flex;
  align-items: center;
}
</style>
