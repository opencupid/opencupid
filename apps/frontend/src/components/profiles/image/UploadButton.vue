<script setup lang="ts">
import AvatarUploadIcon from '@/assets/icons/files/avatar-upload.svg'
import DoodleIcons from '@/components/icons/DoodleIcons.vue'
import { computed, ref } from 'vue'

const props = defineProps<{
  capture?: 'user' | 'environment' | undefined
  genericIcon?: boolean
}>()

defineEmits<{
  (e: 'file:change', event: Event): void
}>()

const fileInput = ref<HTMLInputElement>()

const captureAttr = computed(() => (props.capture ? 'user' : null))
</script>

<template>
  <div class="image-upload-button">
    <BFormFile
      :id="'image-upload-input' + captureAttr"
      accept=".jpg,.jpeg,.png,.gif"
      ref="fileInput"
      autofocus
      @change="$emit('file:change', $event)"
      :plain="true"
      label-class="file-upload-label"
    >
      <template #label>
        <div class="ratio ratio-1x1">
          <div class="btn btn-secondary rounded rounded-lg-5 w-100 file-upload-label">
            <DoodleIcons name="IconCamera2" class="svg-icon" v-if="captureAttr" />
            <AvatarUploadIcon class="svg-icon" v-else-if="genericIcon" />
            <DoodleIcons name="IconPhoto" class="svg-icon" v-else />
          </div>
        </div>
      </template>
    </BFormFile>
  </div>
</template>

<style lang="scss">
.image-upload-button {
  input {
    display: none !important;
  }
  .file-upload-label {
    width: 100%;
  }
  svg {
    width: 100%;
    height: 100%;
  }
}
</style>
