<script setup lang="ts">
import type { UserContentMetadata } from '@zod/userContent/userContent.dto'

defineProps<{
  item: UserContentMetadata
}>()
</script>

<template>
  <div class="community-teaser p-2 rounded shadow-sm">
    <div class="community-teaser-title text-truncate">{{ item.content }}</div>
    <div class="community-teaser-author text-muted small">
      {{ item.postedBy.publicName }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.community-teaser {
  background-color: var(--bs-community-light);
  cursor: pointer;
  min-width: 0;
  font-size: 0.95rem;
}
.community-teaser-title {
  font-weight: 600;
}
</style>
