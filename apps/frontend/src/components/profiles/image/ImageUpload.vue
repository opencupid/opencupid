<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { detectMobile } from '@/lib/mobile-detect'

import LoadingComponent from '@/components/LoadingComponent.vue'
import ErrorComponent from '@/components/ErrorComponent.vue'
import UploadButton from './UploadButton.vue'
import AvatarUploadIcon from '@/assets/icons/files/avatar-upload.svg'
import { useImageStore } from '@/store/imageStore'

const imageStore = useImageStore()
const { t } = useI18n()

// State
const preview = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const isLoading = ref(false)
const error = ref<string | null>('')

const fileInput = ref<HTMLInputElement>()
const captionText = ref<string>('')

const showModal = ref(false)
const showCaptureChooser = ref(true)

const isMobile = computed(() => {
  return detectMobile()
})

const openModal = () => {
  showCaptureChooser.value = true
  showModal.value = true
}

const closeModal = () => {
  showCaptureChooser.value = true
  showModal.value = false
  preview.value = null
  selectedFile.value = null
  isLoading.value = false
  if (fileInput.value) fileInput.value.value = ''
}

/**
 * Upload the selected file
 */
const handleUpload = async () => {
  if (!selectedFile.value) return
  isLoading.value = true
  error.value = ''

  const res = await imageStore.uploadProfileImage(selectedFile.value, captionText.value)

  if (!res.success) {
    console.error('Upload error:', res.message)
    error.value = res.message
    isLoading.value = false
    return
  }
  closeModal()
}

/**
 * Handle file selection: set preview and keep file
 */
const handleFileChange = (event: Event) => {
  showCaptureChooser.value = false
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  selectedFile.value = file
  if (!file) {
    preview.value = null
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    preview.value = typeof reader.result === 'string' ? reader.result : null
  }
  reader.readAsDataURL(file)
  showModal.value = true
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
    initial-animation
    fullscreen="md"
    :title="t('profiles.image_upload.title')"
  >
    <div v-if="preview" class="preview-container">
      <div class="mb-3">
        <LoadingComponent v-if="isLoading" />
        <div class="ratio ratio-1x1">
          <img
            :src="preview"
            alt="Preview"
            width="200"
            :class="isLoading ? 'loading' : ''"
            class="preview-image"
          />
        </div>
      </div>
      <!-- <div class="mb-3">
        <FormKit
          type="textarea"
          input-class="form-control-sm"
          placeholder="Caption this..."
          v-model="captionText"
          label=""
          floating-label="false"
          auto-height
          :validation-messages="{
            required: 'Please write a sentence or two about yourself',
            min: 'Name must be at least 2 characters long',
            max: 'Name must be less than 50 characters long',
          }"
        />
      </div> -->
      <ErrorComponent :error="error" />
      <div class="mb-3 justify-content-center d-flex flex-column gap-2 align-items-center">
        <FormKit
          type="button"
          wrapper-class=""
          input-class="btn btn-primary btn-lg mb-3"
          :label="t('profiles.image_upload.looks_good')"
          :disabled="isLoading"
          @click.prevent="handleUpload"
        />
        <a
          href="#"
          @click.prevent="closeModal"
          class="text-secondary link-underline link-underline-opacity-0"
          >{{ t('profiles.image_upload.nevermind') }}</a
        >
      </div>
    </div>
    <div
      v-if="showCaptureChooser"
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
          <a
            href="#"
            @click.prevent="closeModal"
            class="text-secondary link-underline link-underline-opacity-0"
            >{{ t('profiles.image_upload.nevermind') }}</a
          >
        </div>
      </div>
    </div>
  </BModal>
</template>

<style lang="scss" scoped>
img {
  object-fit: cover;
}

.preview-image {
  .loading {
    opacity: 0.5;
  }
}

.loading-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2rem;
  height: 2rem;
}
</style>
