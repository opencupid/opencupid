<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { detectMobile } from '@/lib/mobile-detect'

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

const showModal = ref(false)

const openModal = () => {
  modalState.value = isMobile.value ? 'chooser' : 'preview'
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const handleUpload = async () => {
  if (!selectedFile.value) return
  isLoading.value = true
  error.value = null

  const res = await imageStore.uploadProfileImage(selectedFile.value, captionText.value)
  if (!res.success) {
    error.value = res.message
    isLoading.value = false
    return
  }
  closeModal()
}

const handleFileChange = (event: Event) => {
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
    modalState.value = 'preview'
    showModal.value = true
  }
  reader.readAsDataURL(file)
}

const backFromPreview = () => {
  if (isMobile.value) {
    modalState.value = 'chooser'
  } else {
    closeModal()
  }
}

function onModalHidden() {
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
    <BButton
      v-if="isMobile"
      variant="secondary"
      class="w-100 h-100"
      @click="openModal"
      @touchend="openModal"
    >
      <AvatarUploadIcon class="svg-icon w-100 h-100" />
    </BButton>
    <UploadButton
      v-else
      @file:change="handleFileChange"
      :genericIcon="true"
    />

    <div
      v-if="error"
      class="text-danger mt-2"
    >
      {{ error }}
    </div>
  </div>

  <BModal
    :show="showModal"
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
    <div
      v-show="modalState === 'preview'"
      class="preview-container w-100"
    >
      <ErrorComponent
        :error="error"
        v-if="error"
      />
      <div
        v-if="preview && !error"
        class="mb-3"
      >
        <BOverlay
          spinner-type="grow"
          :show="isLoading"
        >
          <div
            class="h-100 overflow-hidden"
            v-show="modalState === 'preview'"
          >
            <img
              :src="preview"
              alt="Preview"
              class="preview-image"
            />
          </div>
        </BOverlay>
      </div>

      <div class="mb-3 justify-content-center d-flex flex-column gap-2 align-items-center">
        <BButton
          variant="primary"
          size="lg"
          @click.prevent="handleUpload"
          :label="t('profiles.image_upload.looks_good')"
          :disabled="isLoading || !!error"
        >
          {{ t('profiles.image_upload.looks_good') }}
        </BButton>
        <BButton
          variant="link-secondary"
          @click.prevent="backFromPreview"
          class="link-secondary mt-3"
          size="sm"
        >
          {{ t('profiles.image_upload.nevermind') }}
        </BButton>
      </div>
    </div>

    <!-- Mobile: Capture Chooser -->
    <div v-show="modalState === 'chooser'">
      <div class="d-flex flex-column align-items-center h-100 justify-content-center">
        <div class="mx-auto col-6 d-flex flex-column align-items-center">
          <div class="mb-3 d-flex flex-column align-items-center">
            <UploadButton
              @file:change="handleFileChange"
              :key="'capture-none'"
              class="w-100"
            />
            <div class="mt-0 form-text text-mute text-center">
              {{ t('profiles.image_upload.add_from_phone') }}
            </div>
          </div>
          <div class="mb-4 d-flex flex-column align-items-center">
            <UploadButton
              @file:change="handleFileChange"
              capture="user"
              :key="'capture-user'"
              class="w-100"
            />
            <div class="form-text text-muted text-center">
              {{ t('profiles.image_upload.take_photo') }}
            </div>
          </div>
          <div>
            <BButton
              variant="link-secondary"
              @click.prevent="closeModal"
              class="link-secondary"
              size="sm"
            >
              {{ t('profiles.image_upload.nevermind') }}
            </BButton>
          </div>
        </div>
      </div>
    </div>
  </BModal>
</template>

<style scoped lang="scss">
img {
  object-fit: cover;
}
.form-text {
  line-height: 1.125;
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
