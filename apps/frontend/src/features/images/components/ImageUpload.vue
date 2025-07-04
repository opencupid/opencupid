<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { detectMobile } from '@/lib/mobile-detect'

import LoadingComponent from '@/features/shared/ui/LoadingComponent.vue'
import ErrorComponent from '@/features/shared/ui/ErrorComponent.vue'
import UploadButton from './UploadButton.vue'
import AvatarUploadIcon from '@/assets/icons/files/avatar-upload.svg'
import { useImageStore } from '@/features/images/stores/imageStore'

const imageStore = useImageStore()
const { t } = useI18n()

// Upload state
const selectedFile = ref<File | null>(null)
const preview = ref<string | null>(null)
const captionText = ref<string>('')

const isLoading = ref(false)
const error = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// Detect device type
const isMobile = computed(() => detectMobile())

// Modal state
type ModalState = 'closed' | 'chooser' | 'preview'
const modalState = ref<ModalState>('closed')
// const showModal = computed(() => modalState.value !== 'closed')
const showModal = ref(false)

const openModal = () => {
  modalState.value = isMobile.value ? 'chooser' : 'preview'
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false // this triggers @hidden
}




const handleUpload = async () => {
  console.log('handleUpload:', selectedFile.value, captionText.value)
  if (!selectedFile.value) return
  isLoading.value = true
  error.value = null

 const res = await imageStore.uploadProfileImage(selectedFile.value, captionText.value)
  if (!res.success) {
    error.value = res.message
    isLoading.value = false
    return
  }

  // just hide the modal — cleanup happens after
  modalState.value = 'closed'
}

const handleFileChange = (event: Event) => {
  console.log('handleFileChange:', preview.value, selectedFile.value)
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  selectedFile.value = file

  if (!file) {
    console.log('No file selected')
    preview.value = null
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    console.log('onload:')
    preview.value = typeof reader.result === 'string' ? reader.result : null
       modalState.value = 'preview'
    showModal.value = true
  }
  reader.readAsDataURL(file)
}

watch(preview, newPreview => {
  console.log('Preview updated:')
})

function onModalHidden() {
  console.log('Modal fully hidden — cleaning up')
  modalState.value = 'closed'
  selectedFile.value = null
  preview.value = null
  captionText.value = ''
  error.value = null
  isLoading.value = false
  if (fileInput.value) fileInput.value.value = ''
}


</script>

<template>
  <div class="image-upload h-100">
    <BButton v-if="isMobile" variant="secondary" class="w-100 h-100" @click="openModal">
      <AvatarUploadIcon class="svg-icon w-100 h-100" />
    </BButton>
    <UploadButton v-else @file:change="handleFileChange" :genericIcon="true" />

    <div v-if="error" class="text-danger mt-2">
      {{ error }}
    </div>
  </div>

  <BModal
    v-model="showModal"
    centered
    button-size="sm"
    :focus="false"
    :no-close-on-backdrop="true"
    :no-footer="true"
    :cancel-title="t('profiles.image_upload.nevermind')"
    body-class="d-flex flex-column align-items-center justify-content-center"
    initial-animation
    fullscreen="md"
    :title="t('profiles.image_upload.title')"
    @hidden="onModalHidden"
  >
    <!-- Preview Modal -->
    <div v-if="modalState === 'preview'" class="preview-container w-100">
      <div class="mb-3">
        <div class="ratio ratio-4x3 position-relative">
          <img v-if="preview" :src="preview" alt="Preview" width="200" class="preview-image" />
          <div v-if="isLoading" class="spinner-overlay">
            <LoadingComponent />
          </div>
        </div>
      </div>

      <ErrorComponent :error="error" />
      <div class="mb-3 justify-content-center d-flex flex-column gap-2 align-items-center">
        <BButton
          variant="primary"
          @click.prevent="handleUpload"
          :label="t('profiles.image_upload.looks_good')"
          :disabled="isLoading"
        >
          {{ t('profiles.image_upload.looks_good') }}
        </BButton>
        <BButton variant="link-secondary" @click.prevent="closeModal" class="link-secondary">
          {{ t('profiles.image_upload.nevermind') }}
        </BButton>
      </div>
    </div>

    <!-- Mobile: Capture Chooser -->
    <div
      v-if="modalState === 'chooser'"
      class="d-flex flex-column align-items-center h-100 justify-content-center"
    >
      <div class="w-50 mx-auto d-flex flex-column align-items-center">
        <div class="mb-4">
          <UploadButton @file:change="handleFileChange" :key="'capture-none'" />
          <div class="mt-2 text-muted">{{ t('profiles.image_upload.add_from_phone') }}</div>
        </div>
        <div class="mb-3">
          <UploadButton @file:change="handleFileChange" capture="user" :key="'capture-user'" />
          <div class="mt-2 text-muted">{{ t('profiles.image_upload.take_photo') }}</div>
        </div>
        <div>
          <BButton variant="link-secondary" @click.prevent="closeModal" class="link-secondary">
            {{ t('profiles.image_upload.nevermind') }}
          </BButton>
        </div>
      </div>
    </div>
  </BModal>
</template>

<style scoped lang="scss">
img {
  object-fit: cover;
}

.preview-image {
  object-fit: cover;
  width: 100%;
  height: 100%;
  display: block;
}

.spinner-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.5); // semi-transparent layer
  z-index: 10;
}
</style>
