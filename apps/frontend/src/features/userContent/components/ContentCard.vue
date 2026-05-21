<script setup lang="ts">
import PostCard from '@/features/posts/components/PostCard.vue'
import EventCard from '@/features/events/components/EventCard.vue'
import CommunityCard from '@/features/community/components/CommunityCard.vue'
import type { OwnerUserContent } from '@zod/userContent/publicContent.dto'

defineProps<{
  item: OwnerUserContent
  showDetails: boolean
}>()

defineEmits<{
  (e: 'click', item: OwnerUserContent): void
}>()
</script>

<template>
  <PostCard
    v-if="item.kind === 'post'"
    :post="item"
    :show-details="showDetails"
    @click="$emit('click', item)"
  />
  <EventCard
    v-else-if="item.kind === 'event'"
    :event="item"
    :show-details="showDetails"
    @click="$emit('click', item)"
  />
  <CommunityCard
    v-else-if="item.kind === 'community'"
    :community="item"
    :show-details="showDetails"
    @click="$emit('click', item)"
  />
</template>
