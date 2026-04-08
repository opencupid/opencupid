<script setup lang="ts">
import type { PublicPostWithProfile } from '@zod/post/post.dto'

defineProps<{ item: PublicPostWithProfile }>()
defineEmits<{ (e: 'click', id: string): void }>()
</script>

<template>
  <div
    class="post-map-popup cursor-pointer p-3 user-select-none"
    @click="$emit('click', item.id)"
  >{{ item.content.substring(0, 120) }}</div>
</template>

<style scoped>
.post-map-popup {
  background: var(--postit-bg);
  font-family: 'Patrick Hand', cursive;
  font-size: 0.85rem;
  word-break: break-word;
}
</style>
