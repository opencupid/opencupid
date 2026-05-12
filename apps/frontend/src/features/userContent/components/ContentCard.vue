<script setup lang="ts">
import PostCard from '@/features/posts/components/PostCard.vue'
import EventCard from '@/features/events/components/EventCard.vue'
import type { OwnerUserContent } from '@zod/userContent/publicContent.dto'

defineProps<{
  item: OwnerUserContent
  showDetails: boolean
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
    @click="$emit('click', item)"
    @edit="$emit('edit', item)"
    @hide="$emit('hide', item)"
    @delete="$emit('delete', item)"
  />
  <EventCard
    v-else-if="item.kind === 'event'"
    :event="item"
    :show-details="showDetails"
    @click="$emit('click', item)"
    @edit="$emit('edit', item)"
    @hide="$emit('hide', item)"
    @delete="$emit('delete', item)"
  />
  <!-- Placeholder until CommunityCard exists. Owner-only items must remain
       visible in the unified list — silent filtering would re-introduce the
       same blindspot the earlier `v-else` had. -->
  <div
    v-else-if="item.kind === 'community'"
    class="content-card-placeholder"
  >
    <strong>Community</strong>
    <span>{{ item.content }}</span>
    <span v-if="item.yearFounded">· est. {{ item.yearFounded }}</span>
  </div>
</template>

<style scoped>
.content-card-placeholder {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px dashed var(--bs-border-color, #ced4da);
  border-radius: 0.375rem;
  font-size: 0.9rem;
}
</style>
