<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { onMounted, ref, provide, computed, toRef } from 'vue'
import { useBootstrap } from '@/lib/bootstrap'

import StoreErrorOverlay from '@/features/shared/ui/StoreErrorOverlay.vue'
import EditButton from '@/features/myprofile/components/EditButton.vue'
import ProfileContent from '@/features/publicprofile/components/ProfileContent.vue'

import { useMyProfileViewModel } from '../composables/useMyProfileViewModel'
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
  updateScopes,
  updateProfile,
} = useMyProfileViewModel(props.editMode)

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
  const newValue = !formData.isDatingActive
  formData.isDatingActive = newValue
  await updateScopes({ isDatingActive: newValue })
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
