<script setup lang="ts">
import { type PublicTag } from '@zod/tag/tag.dto'

defineProps<{
  tags: PublicTag[] | undefined
}>()
</script>

<template>
  <ul
    class="tags list-unstyled mb-0 d-inline-flex flex-wrap align-items-center"
    v-if="tags && tags.length"
  >
    <li v-for="tag in tags" :key="tag.slug" class="me-2">
      <BBadge variant="warning">#{{ tag.name }}</BBadge>
    </li>
  </ul>
</template>
