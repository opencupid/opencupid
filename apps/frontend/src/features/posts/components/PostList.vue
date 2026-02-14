<script setup lang="ts">
import { ref } from 'vue'
import { useInfiniteScroll } from '@vueuse/core'
import PostCard from './PostCard.vue'
import OsmPostMap from './OsmPostMap.vue'
import { type PostTypeType } from '@zod/generated'
import { usePostListViewModel } from '../composables/usePostListViewModel'
import IconFilter from '@/assets/icons/interface/filter.svg'
import ViewModeToggler from '@/features/shared/ui/ViewModeToggler.vue'

interface Props {
  title?: string
  type?: PostTypeType
  showFilters?: boolean
  scope?: 'all' | 'nearby' | 'recent' | 'my'
  nearbyParams?: { lat: number; lon: number; radius: number }
  emptyMessage?: string
  isActive?: boolean
  viewMode?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Posts',
  showFilters: true,
  scope: 'all',
  emptyMessage: 'No posts found',
  isActive: true,
  viewMode: 'grid',
})

const viewModeModel = defineModel<string>('viewMode', { default: 'grid' })

const emit = defineEmits<{
  (e: 'intent:fullview', post: any): void
  (e: 'intent:edit', post: any): void
  (e: 'intent:close'): void
  (e: 'intent:hide', post: any): void
  (e: 'intent:delete', post: any): void
  (e: 'intent:saved', post: any): void
  (e: 'intent:contact', post: any): void
}>()

const {
  postStore,
  posts,
  selectedType,
  isLoadingMore,
  hasMorePosts,
  isInitialized,
  handleTypeFilter,
  handleLoadMore,
  handleRetry,
} = usePostListViewModel(props)

const scrollContainer = ref<HTMLElement>()

useInfiniteScroll(
  scrollContainer,
  async () => {
    if (isLoadingMore.value || !hasMorePosts.value || !isInitialized.value) {
      return
    }
    await handleLoadMore()
  },
  {
    distance: 300,
    canLoadMore: () => hasMorePosts.value && !isLoadingMore.value && isInitialized.value,
  }
)

function handlePostClick(post: any) {
  emit('intent:fullview', post)
}
function handlePostEdit(post: any) {
  emit('intent:edit', post)
}
function handlePostDelete(post: any) {
  emit('intent:delete', post)
}
function handlePostHide(post: any) {
  emit('intent:hide', post)
}
function handlePostContact(post: any) {
  emit('intent:contact', post)
}
function handlePostSaved(post: any) {
  emit('intent:saved', post)
}
function handleClose() {
  emit('intent:close')
}
</script>

<template>
  <div class="post-list h-100">
    <!-- Filter -->
    <div class="filter-bar">
      <div v-if="showFilters">
        <BInputGroup>
          <template #prepend>
            <BInputGroupText><IconFilter class="svg-icon" /></BInputGroupText>
          </template>

          <BFormSelect v-model="selectedType" @change="handleTypeFilter" size="sm">
            <option value="">{{ $t('posts.filters.all') }}</option>
            <option value="OFFER">{{ $t('posts.filters.offers') }}</option>
            <option value="REQUEST">{{ $t('posts.filters.requests') }}</option>
          </BFormSelect>
        </BInputGroup>
      </div>
      <ViewModeToggler v-model="viewModeModel" />
    </div>

    <div v-if="postStore.isLoading && posts.length === 0" class="mb-2">
      <div class="loading-spinner"></div>
      <p>{{ $t('uicomponents.loading.loading') }}</p>
    </div>

    <div v-else-if="postStore.error" class="text-danger mb-2">
      <p>{{ postStore.error }}</p>
      <BButton variant="warning" @click="handleRetry" class="btn btn-primary">
        {{ $t('uicomponents.error.retry') }}
      </BButton>
    </div>

    <div v-else-if="posts.length === 0" class="mb-2">
      <p>{{ emptyMessage }}</p>
    </div>

    <!-- Grid View -->
    <div v-if="viewModeModel === 'grid'" ref="scrollContainer" class="container-fluid overflow-auto hide-scrollbar h-100">
      <TransitionGroup
        name="fade"
        tag="div"
        v-if="posts.length > 0"
        class="row row-cols-1 g-2 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 gx-4 gy-4"
      >
        <BCol v-for="post in posts" :key="post.id">
          <PostCard
            :post="post"
            :show-details="false"
            :dim-hidden="scope === 'my'"
            @click="() => handlePostClick(post)"
            @edit="() => handlePostEdit(post)"
            @hide="() => handlePostHide(post)"
            @delete="() => handlePostDelete(post)"
            @contact="() => handlePostContact(post)"
            class="clickable"
          />
        </BCol>
      </TransitionGroup>
    </div>

    <!-- Map View -->
    <OsmPostMap
      v-if="viewModeModel === 'map' && posts.length > 0"
      :posts="posts"
      class="map-view h-100"
      @post:select="handlePostClick"
      @edit="handlePostEdit"
      @contact="handlePostContact"
      @hide="handlePostHide"
      @delete="handlePostDelete"
    />

    <div v-if="isLoadingMore" class="text-center py-3">
      <BSpinner small variant="primary" />
      <span class="ms-2 text-muted">{{ $t('uicomponents.loading.loading') }}</span>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding: 0.25rem 0.5rem;
  background-color: var(--bs-light);
  border-radius: 0.25rem;
}
</style>
