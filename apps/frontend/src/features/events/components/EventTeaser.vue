<script setup lang="ts">
import type { UserContentMetadata } from '@zod/userContent/userContent.dto'
import IconCalendar from '@/assets/icons/interface/calendar.svg'

defineProps<{
  item: UserContentMetadata
}>()
</script>

<template>
  <div class="event-teaser d-flex flex-row">
    <IconCalendar class="d-block svg-icon-lg flex-shrink-0 flex-grow-0 me-2" />
    <div class="flex-grow-1 text-truncate">{{ item.content }}</div>
  </div>
</template>

