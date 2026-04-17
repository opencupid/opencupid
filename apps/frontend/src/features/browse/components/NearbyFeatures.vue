<script setup lang="ts">
import type { MapPoi } from '@/features/map/types/map.types'
import type { PostSummary } from '@zod/post/post.dto'

defineProps<{
  posts: MapPoi[]
}>()

const emit = defineEmits<{
  (e: 'post:select', post: PostSummary): void
}>()

function handleClick(poi: MapPoi) {
  emit('post:select', poi.source as PostSummary)
}
</script>

<template>
  <div
    v-if="posts.length > 0"
    class="nearby-posts d-flex gap-2 p-2 overflow-auto hide-scrollbar"
  >
    <div
      v-for="poi in posts"
      :key="poi.id"
      class="nearby-post-card flex-shrink-0 p-2 cursor-pointer user-select-none"
      @click="handleClick(poi)"
    >
      {{ (poi.title ?? '').substring(0, 120) }}
    </div>
  </div>
</template>

<style scoped>
.nearby-posts {
  scroll-snap-type: x mandatory;
}

.nearby-post-card {
  background: var(--postit-bg);
  font-family: 'Patrick Hand', cursive;
  font-size: 0.85rem;
  word-break: break-word;
  border-radius: var(--radius-md, 0.5rem);
  width: 10rem;
  max-height: 5rem;
  overflow: hidden;
  scroll-snap-align: start;
}
</style>
