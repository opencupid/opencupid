<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBootstrap } from '@/lib/bootstrap'

import StoreErrorOverlay from '@/features/shared/ui/StoreErrorOverlay.vue'
import ProfileContent from '@/features/publicprofile/components/ProfileContent.vue'

import { useMyProfileViewModel } from '../composables/useMyProfileViewModel'
import MyProfileSecondaryNav from './MyProfileSecondaryNav.vue'
import EditableFields from './EditableFields.vue'
import EditSaveButton from '@/features/shared/ui/EditSaveButton.vue'
import ChevronLeftIcon from '@/assets/icons/arrows/arrow-single-left.svg'


const props = defineProps<{
  editMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'datingmode:prefs'): void
  (e: 'datingmode:wizard'): void
}>()

const showModal = ref(false)
const {
  error,
  isLoading,
  viewState,
  formData,
  profilePreview,
  isDatingOnboarded,
  updateScopes,
  updateProfile,
} = useMyProfileViewModel(props.editMode)

const openDatingPrefs = () => {
  if (!isDatingOnboarded.value) {
    emit('datingmode:wizard')
    return
  }
  emit('datingmode:prefs')
}

const toggleDating = async () => {
  const newValue = !formData.isDatingActive
  formData.isDatingActive = newValue
  await updateScopes({ isDatingActive: newValue })
}

</script>

<template>
  <div>
    <EditableFields
      v-model="formData"
      :editState="viewState.isEditable"
      @updated="updateProfile"
    >
      <StoreErrorOverlay
        v-if="error"
        :error
      />
      <template v-else>
        <div class="px-0">
          <MyProfileSecondaryNav
            v-model="viewState"
            v-model:isDatingActive="formData.isDatingActive"
            :is-dating-onboarded="isDatingOnboarded"
            @datingmode:toggle="toggleDating"
            @datingmode:prefs="openDatingPrefs"
          />
        </div>
        <div :class="[viewState.currentScope, { editable: viewState.isEditable }]">
          <ProfileContent
            v-if="profilePreview"
            :isLoading="isLoading"
            @intent:field:edit="showModal = true"
            class="shadow-lg"
            :profile="profilePreview"
          />
          <div class="position-sticky bottom-0 pb-2 px-3 text-end">
            <EditSaveButton v-model="viewState.isEditable" />
          </div>
        </div>
      </template>
    </EditableFields>
  </div>
</template>

<style scoped lang="scss">
@import '@/css/theme.scss';

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
