<script setup lang="ts">
import type { PointFeature } from '@shared/zod/map/cluster.dto'

defineProps<{ item: PointFeature }>()
defineEmits<{ (e: 'click', id: string): void }>()
</script>

<template>
  <div
    class="post-map-popup bg-post-light cursor-pointer p-3 user-select-none"
    @click="$emit('click', item.id)"
  >
    {{ (item.postContent ?? '').substring(0, 120) }}
  </div>
</template>

<style scoped>
.post-map-popup {
  font-family: 'Patrick Hand', cursive;
  font-size: 0.85rem;
  word-break: break-word;
}
</style>
