<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import ErrorComponent from '@/features/shared/ui/ErrorComponent.vue'
import UploadButton from './UploadButton.vue'

const props = defineProps<{
  modalState: 'chooser' | 'preview'
  preview: string | null
  isLoading: boolean
  error: string | null
}>()

defineEmits<{
  (e: 'file:change', event: Event): void
  (e: 'upload'): void
  (e: 'cancel'): void
  (e: 'back'): void
}>()

const { t } = useI18n()
</script>

<template>
  <div class="image-upload-content">
    <!-- Preview Modal -->
    <div v-show="props.modalState === 'preview'" class="preview-container w-100">
      <ErrorComponent :error="props.error" v-if="props.error" />
      <div v-if="props.preview && !props.error" class="mb-3">
        <BOverlay spinner-type="grow" :show="props.isLoading">
          <div class="ratio ratio-4x3 position-relative">
            <div class="preview-wrapper overflow-hidden">
              <img :src="props.preview" alt="Preview" class="preview-image" />
            </div>
          </div>
        </BOverlay>
      </div>

      <div class="mb-3 justify-content-center d-flex flex-column gap-2 align-items-center">
        <BButton
          variant="primary"
          size="lg"
          @click.prevent="$emit('upload')"
          :label="t('profiles.image_upload.looks_good')"
          :disabled="props.isLoading || !!props.error"
        >
          {{ t('profiles.image_upload.looks_good') }}
        </BButton>
        <BButton
          variant="link-secondary"
          @click.prevent="$emit('back')"
          class="link-secondary mt-3"
          size="sm"
        >
          {{ t('profiles.image_upload.nevermind') }}
        </BButton>
      </div>
    </div>

    <!-- Mobile: Capture Chooser -->
    <div v-show="props.modalState === 'chooser'">
      <div class="d-flex flex-column align-items-center h-100 justify-content-center">
        <div class="mx-auto d-flex flex-column align-items-center">
          <div class="mb-5 d-flex flex-column align-items-center">
            <div class="col-6">
              <UploadButton @file:change="$emit('file:change', $event)" :key="'capture-none'" />
            </div>
            <div class="mt-0 form-text text-mute text-center">
              {{ t('profiles.image_upload.add_from_phone') }}
            </div>
          </div>
          <div class="mb-4 d-flex flex-column align-items-center">
            <div class="col-6">
              <UploadButton @file:change="$emit('file:change', $event)" capture="user" :key="'capture-user'" />
            </div>
            <div class="form-text text-muted text-center">{{ t('profiles.image_upload.take_photo') }}</div>
          </div>
          <div>
            <BButton
              variant="link-secondary"
              @click.prevent="$emit('cancel')"
              class="link-secondary"
              size="sm"
            >
              {{ t('profiles.image_upload.nevermind') }}
            </BButton>
          </div>
        </div>
      </div>
    </div>
  </div>
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
  background: rgba(255, 255, 255, 0.5);
  z-index: 10;
}
</style>
