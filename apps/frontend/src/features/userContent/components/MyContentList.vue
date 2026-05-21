<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useInfiniteScroll } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import ContentCard from './ContentCard.vue'
import OwnerToolbar from '@/features/posts/components/OwnerToolbar.vue'
import PostPlaceholdersGrid from '@/features/posts/components/PostPlaceholdersGrid.vue'
import type { OwnerUserContent } from '@zod/userContent/publicContent.dto'
import { useUserContentStore } from '../stores/userContentStore'

defineOptions({ inheritAttrs: false })

const emit = defineEmits<{
  (e: 'intent:edit', item: OwnerUserContent): void
  (e: 'intent:delete', item: OwnerUserContent): void
  (e: 'intent:hide', item: OwnerUserContent): void
  (e: 'intent:fullview', item: OwnerUserContent): void
}>()

const userContentStore = useUserContentStore()
const { myContent, isLoading, isInitialized } = storeToRefs(userContentStore)

const pageSize = 20
const currentPage = ref(0)
const hasMore = ref(true)

async function load(append = false) {
  if (!append) {
    currentPage.value = 0
    hasMore.value = true
  }
  const result = await userContentStore.fetchMyContent({
    limit: pageSize,
    offset: currentPage.value * pageSize,
  })
  if (result.success) {
    const fetched = result.data?.items ?? []
    if (fetched.length < pageSize) {
      hasMore.value = false
    }
  }
}

onMounted(() => {
  if (!isInitialized.value) load()
})

const scrollContainer = ref<HTMLElement>()

useInfiniteScroll(
  scrollContainer,
  async () => {
    if (isLoading.value || !hasMore.value || !isInitialized.value) return
    currentPage.value++
    await load(true)
  },
  {
    distance: 300,
    canLoadMore: () => hasMore.value && !isLoading.value && isInitialized.value,
  }
)

const items = computed(() => myContent.value)
</script>

<template>
  <div class="content-list h-100 w-100 d-flex flex-column">
    <div
      v-if="!isInitialized && items.length === 0"
      class="p-2 p-md-3"
    >
      <PostPlaceholdersGrid />
    </div>

    <div
      v-else-if="items.length === 0"
      class="d-flex align-items-center justify-content-center flex-grow-1 w-100"
    >
      <p class="text-muted mb-0 text-center w-100">{{ $t('posts.messages.no_posts') }}</p>
    </div>

    <div
      ref="scrollContainer"
      class="container-fluid overflow-auto hide-scrollbar flex-grow-1 flex-shrink-1"
      v-if="items.length > 0"
    >
      <div
        v-for="item in items"
        :key="item.id"
        class="position-relative"
      >
        <ContentCard
          :item="item"
          :show-details="false"
          class="clickable content-card mb-2"
          :class="{ 'opacity-50': !item.isVisible }"
          @click="emit('intent:fullview', item)"
        />
        <OwnerToolbar
          class="owner-toolbar position-absolute"
          :is-visible="item.isVisible"
          @edit="emit('intent:edit', item)"
          @hide="emit('intent:hide', item)"
          @delete="emit('intent:delete', item)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.content-card {
  transition: opacity 300ms ease-in-out;
}
.owner-toolbar {
  z-index: 2;
  margin-top: -2rem;
  background-color: rgba(255, 255, 255, 0.5);
  right: 1rem;
}
</style>
