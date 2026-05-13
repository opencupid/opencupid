<script setup lang="ts">
import type { UserContentMetadata } from '@zod/userContent/userContent.dto'

defineProps<{
  item: UserContentMetadata
}>()
</script>

<template>
  <div class="event-teaser p-2 rounded shadow-sm">
    <div class="event-teaser-title text-truncate">{{ item.content }}</div>
    <div class="event-teaser-author text-muted small">
      {{ item.postedBy.publicName }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.event-teaser {
  background-color: var(--bs-event-light);
  cursor: pointer;
  min-width: 0;
  font-size: 0.95rem;
}
.event-teaser-title {
  font-weight: 600;
}
</style>
