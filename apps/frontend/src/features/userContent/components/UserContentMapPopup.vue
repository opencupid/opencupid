<script setup lang="ts">
import { computed } from 'vue'
import ImageTag from '@/features/images/components/ImageTag.vue'
import type { PublicImage } from '@zod/image/image.dto'

const props = defineProps<{ item: { id: string; images: PublicImage[] } }>()

const firstImage = computed(() => props.item.images[0])
</script>

<template>
  <div class="user-select-none position-relative">
    <div
      v-if="firstImage"
      class="popup-image ratio ratio-1x1 overflow-hidden"
    >
      <ImageTag
        :image="firstImage"
        variant="card"
      />
    </div>
    <div class="popup-content">
      <slot name="content"></slot>
    </div>
  </div>
</template>

<style scoped>
.popup-content {
  word-break: break-word;
}
.popup-image + .popup-content {
  position: absolute;
  bottom: 0;
  width: 100%;
}
</style>
