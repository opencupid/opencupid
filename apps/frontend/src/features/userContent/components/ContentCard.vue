<script setup lang="ts">
import PostCard from '@/features/posts/components/PostCard.vue'
import EventCard from '@/features/events/components/EventCard.vue'
import type { OwnerUserContent } from '@zod/userContent/publicContent.dto'

const props = defineProps<{
  item: OwnerUserContent
  showDetails: boolean
  dimHidden?: boolean
}>()

defineEmits<{
  (e: 'click', item: OwnerUserContent): void
  (e: 'edit', item: OwnerUserContent): void
  (e: 'hide', item: OwnerUserContent): void
  (e: 'delete', item: OwnerUserContent): void
}>()
</script>

<template>
  <PostCard
    v-if="item.kind === 'post'"
    :post="item"
    :show-details="showDetails"
    :dim-hidden="dimHidden"
    @click="$emit('click', item)"
    @edit="$emit('edit', item)"
    @hide="$emit('hide', item)"
    @delete="$emit('delete', item)"
  />
  <EventCard
    v-else
    :event="item"
    :show-details="showDetails"
    :dim-hidden="dimHidden"
    @click="$emit('click', item)"
    @edit="$emit('edit', item)"
    @hide="$emit('hide', item)"
    @delete="$emit('delete', item)"
  />
</template>
