<script setup lang="ts">
import { computed, ref } from 'vue'

import AvatarUploadIcon from '@/assets/icons/files/avatar-upload.svg'
import IconCamera2 from '@/assets/icons/interface/camera.svg'
import IconPhoto from '@/assets/icons/interface/photo.svg'

const props = defineProps<{
  capture?: 'user' | 'environment' | undefined
  genericIcon?: boolean
  buttonTitle?: string
}>()

defineEmits<{
  (e: 'file:change', event: Event): void
}>()

const fileInput = ref<HTMLInputElement>()

const captureAttr = computed(() => props.capture || undefined)
const idAttr = computed(() => 'image-upload-input' + (captureAttr.value ?? ''))
</script>

<template>
  <label
    class="file-upload-label"
    :for="idAttr"
    :title="buttonTitle"
  >
    <BFormFile
      :id="idAttr"
      accept="image/jpeg,image/png"
      ref="fileInput"
      autofocus
      @change="$emit('file:change', $event)"
      :plain="true"
      class="file-upload-input"
      :capture="captureAttr"
      :title="buttonTitle"
    >
      <template #label> </template>
    </BFormFile>

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
  </label>
</template>

<style lang="scss">
.file-upload-input {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  opacity: 0 !important;
  z-index: -1 !important;
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
