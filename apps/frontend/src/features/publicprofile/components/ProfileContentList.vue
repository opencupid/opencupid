<script setup lang="ts">
import { ref, watch } from 'vue'
import type { OwnerUserContent, PublicUserContentDetail } from '@zod/userContent/publicContent.dto'
import { useUserContentStore } from '@/features/userContent/stores/userContentStore'
import PostCard from '@/features/posts/components/PostCard.vue'
import EventCard from '@/features/events/components/EventCard.vue'
import CommunityCard from '@/features/community/components/CommunityCard.vue'

const props = defineProps<{
  profileId: string
}>()

const contentStore = useUserContentStore()
const items = ref<(PublicUserContentDetail | OwnerUserContent)[]>([])

watch(
  () => props.profileId,
  async (profileId) => {
    items.value = []
    const res = await contentStore.fetchProfileContent(profileId)
    // Drop a late response for a profile we already navigated away from.
    if (res.success && res.data && profileId === props.profileId) items.value = res.data.items
  },
  { immediate: true }
)
</script>

<template>
  <div
    v-if="items.length > 0"
    class="profile-content-list d-flex flex-column gap-3 px-2"
  >
    <template
      v-for="item in items"
      :key="item.id"
    >
      <PostCard
        v-if="item.kind === 'post'"
        :post="item"
        :show-details="true"
      />
      <EventCard
        v-else-if="item.kind === 'event'"
        :event="item"
        :show-details="true"
      />
      <CommunityCard
        v-else-if="item.kind === 'community'"
        :community="item"
        :show-details="true"
      />
    </template>
  </div>
</template>
