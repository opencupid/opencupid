<script setup lang="ts">
import type { UserContentMetadata } from '@zod/userContent/userContent.dto'
import IconCommunity from '@/assets/icons/interface/community.svg'

defineProps<{
  item: UserContentMetadata
}>()
</script>

<template>
  <div class="community-teaser d-flex flex-row">
    <IconCommunity class="flex-shrink-0 flex-grow-0 me-2 d-block svg-icon-lg" />
    <div class="flex-grow-1 text-truncate">{{ item.content }}</div>
  </div>
</template>

