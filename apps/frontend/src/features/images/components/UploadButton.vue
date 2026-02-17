<script setup lang="ts">
import { computed, ref } from 'vue'

import AvatarUploadIcon from '@/assets/icons/files/avatar-upload.svg'
import IconCamera2 from '@/assets/icons/interface/camera.svg'
import IconPhoto from '@/assets/icons/interface/photo.svg'

const props = defineProps<{
  capture?: 'user' | 'environment' | undefined
  genericIcon?: boolean
}>()

defineEmits<{
  (e: 'file:change', event: Event): void
}>()

const fileInput = ref<HTMLInputElement>()

const captureAttr = computed(() => props.capture || undefined)
const idAttr = computed(() => 'image-upload-input' + (captureAttr.value ?? ''))
</script>

<template>
  <div class="image-upload-button position-relative">
    <label
      class="file-upload-label"
      :for="idAttr"
    >
      <BFormFile
        :id="idAttr"
        accept=".jpg,.jpeg,.png"
        ref="fileInput"
        autofocus
        @change="$emit('file:change', $event)"
        :plain="true"
        class="file-upload-input"
        :capture="captureAttr"
      >
        <template #label> </template>
      </BFormFile>
      <div class="ratio ratio-1x1">
        <div class="btn btn-outline-primary w-100 file-upload-label">
          <IconCamera2
            class="svg-icon"
            v-if="captureAttr"
          />
          <AvatarUploadIcon
            class="svg-icon"
            v-else-if="genericIcon"
          />
          <IconPhoto
            class="svg-icon"
            v-else
          />
        </div>
      </div>
    </label>
  </div>
</template>

<style lang="scss">
.file-upload-input {
  position: absolute !important;
  width: 1px !important;
  height: 1px Imp !important;
  opacity: 0 !important;
  z-index: -1 Imp !important;
}
.file-upload-label {
  width: 100%;
  margin-bottom: 0;
  svg {
    width: 100%;
    height: 100%;
  }
}
</style>
