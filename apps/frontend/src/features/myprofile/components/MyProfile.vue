<script setup lang="ts">
import { ref } from 'vue'

import ProfileContent from '@/features/publicprofile/components/ProfileContent.vue'

import { useMyProfileViewModel } from '../composables/useMyProfileViewModel'
import MyProfileSecondaryNav from './MyProfileSecondaryNav.vue'
import EditableFields from './EditableFields.vue'
import EditSaveButton from '@/features/shared/ui/EditSaveButton.vue'
import FloatingButton from '@/features/shared/components/FloatingButton.vue'

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
  if (!isDatingOnboarded.value) {
    emit('datingmode:wizard')
    return
  }
}
</script>

<template>
  <div class="d-flex flex-grow-1 overflow-hidden flex-column position-relative">
    <MyProfileSecondaryNav
      v-model="viewState"
      v-model:isDatingActive="formData.isDatingActive"
      :is-dating-onboarded="isDatingOnboarded"
      @datingmode:toggle="toggleDating"
      @datingmode:prefs="openDatingPrefs"
      class="flex-shrink-0 flex-grow-0"
    />
    <div
      class="flex-grow-1 flex-shrink-1 overflow-x-hidden overflow-y-auto position-relative d-flex flex-column"
    >
      <EditableFields
        v-model="formData"
        :editState="viewState.isEditable"
        @updated="updateProfile"
        :class="[viewState.currentScope, { editable: viewState.isEditable }]"
        class="scroll hide-scrollbar"
      >
        <ProfileContent
          v-if="profilePreview"
          :isLoading="isLoading"
          @intent:field:edit="showModal = true"
          :profile="profilePreview"
        />
      </EditableFields>
    </div>
    <FloatingButton>
      <EditSaveButton v-model="viewState.isEditable" />
    </FloatingButton>
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
.scroll {
  padding-bottom: 4rem;
}
</style>
