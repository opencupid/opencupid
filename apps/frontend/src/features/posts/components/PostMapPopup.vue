<script setup lang="ts">
import { computed } from 'vue'
import type { PublicPostDetail } from '@zod/post/post.dto'
import ImageTag from '@/features/images/components/ImageTag.vue'

const props = defineProps<{ item: PublicPostDetail }>()
defineEmits<{ (e: 'click', id: string): void }>()

const firstImage = computed(() => props.item.images[0])
</script>

<template>
  <div
    class="post-map-popup bg-post-light cursor-pointer p-3 user-select-none"
    @click="$emit('click', item.id)"
  >
    <div
      v-if="firstImage"
      class="popup-image ratio ratio-4x3 mb-2 rounded overflow-hidden"
    >
      <ImageTag :image="firstImage" variant="card" />
    </div>
    {{ (item.content ?? '').substring(0, 120) }}
  </div>
</template>

<style scoped>
.post-map-popup {
  font-family: 'Patrick Hand', cursive;
  font-size: 0.85rem;
  word-break: break-word;
}
</style>
