<script setup lang="ts">
import { onMounted, ref, provide, toRef } from 'vue'
import { useRouter } from 'vue-router'
import { useBootstrap } from '@/lib/bootstrap'

import StoreErrorOverlay from '@/features/shared/ui/StoreErrorOverlay.vue'
import ProfileContent from '@/features/publicprofile/components/ProfileContent.vue'
import ProfileImage from '@/features/images/components/ProfileImage.vue'

import { useMyProfileViewModel } from '../composables/useMyProfileViewModel'
import { useOwnerProfileStore } from '../stores/ownerProfileStore'
import MyProfileSecondaryNav from '../components/MyProfileSecondaryNav.vue'
import EditableFields from '../components/EditableFields.vue'
import EditSaveButton from '@/features/shared/ui/EditSaveButton.vue'

import IconSetting2 from '@/assets/icons/interface/setting-2.svg'

const router = useRouter()

const emit = defineEmits<{
  (e: 'navigate:settings'): void
  (e: 'close'): void
}>()

const props = defineProps<{
  editMode?: boolean
}>()

const ownerProfileStore = useOwnerProfileStore()

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
</script>

<template>
  <div
    class="d-flex flex-column h-100"
    :class="[viewState.currentScope, { editable: viewState.isEditable }]"
  >
    <div class="offcanvas-header flex-shrink-0">
      <span class="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden">
        <span
          v-if="ownerProfileStore.profile?.profileImages?.length"
          class="owner-profile-avatar flex-shrink-0 overflow-hidden rounded-circle"
        >
          <ProfileImage
            :profile="ownerProfileStore.profile"
            variant="thumb"
            class="img-fluid w-100 h-100"
          />
        </span>
        <span
          id="ownerDrawerLabel"
          class="offcanvas-title text-truncate"
        >
          {{ ownerProfileStore.profile?.publicName }}
        </span>
      </span>
      <button
        type="button"
        class="btn btn-link p-0 ms-2 flex-shrink-0"
        :aria-label="$t('settings.title')"
        @click="emit('navigate:settings')"
      >
        <IconSetting2 class="svg-icon" />
      </button>
      <button
        type="button"
        class="btn-close ms-2"
        :aria-label="$t('common.close')"
        @click="emit('close')"
      />
    </div>
    <div class="flex-grow-1 overflow-auto">
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
          <div class="px-3 pt-2">
            <MyProfileSecondaryNav
              v-model="viewState"
              v-model:isDatingActive="formData.isDatingActive"
              :is-dating-onboarded="isDatingOnboarded"
              @datingmode:toggle="toggleDating"
              @datingmode:prefs="openDatingPrefs"
              @datingmode:profile="openDatingProfile"
            />
          </div>
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
        </template>
      </EditableFields>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '@/css/theme.scss';

.owner-profile-avatar {
  width: 2rem;
  height: 2rem;
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
