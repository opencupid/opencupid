<script setup lang="ts">
import { type PublicTag } from '@zod/tag/tag.dto'

defineProps<{
  tags: PublicTag[] | undefined
}>()
</script>

<template>
  <ul
    class="tags list-unstyled my-0 d-inline-flex flex-wrap align-items-center overflow-hidden"
    v-if="tags && tags.length"
  >
    <li v-for="tag in tags" :key="tag.slug" class="me-2">
      <BBadge variant="warning" :title="tag.name">#{{ tag.name }}</BBadge>
    </li>
  </ul>
</template>

<style lang="css" scoped>
:deep(.badge) {
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  user-select: none;
}
</style>
