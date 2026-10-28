<script setup lang="ts">
import { ref, watch } from 'vue'
import type { OwnerUserContent, PublicUserContentDetail } from '@zod/userContent/publicContent.dto'
import { useUserContentStore } from '@/features/userContent/stores/userContentStore'
import PostFullView from '@/features/posts/components/PostFullView.vue'
import EventFullView from '@/features/events/components/EventFullView.vue'
import CommunityFullView from '@/features/community/components/CommunityFullView.vue'

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
      <PostFullView
        v-if="item.kind === 'post'"
        :post="item"
        hide-close
      />
      <EventFullView
        v-else-if="item.kind === 'event'"
        :event="item"
        hide-close
      />
      <CommunityFullView
        v-else-if="item.kind === 'community'"
        :community="item"
        hide-close
      />
    </template>
  </div>
</template>
