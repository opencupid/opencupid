<script setup lang="ts">
import { ref } from 'vue'
import { useInfiniteScroll } from '@vueuse/core'
import PostCard from './PostCard.vue'
import PostPlaceholdersGrid from './PostPlaceholdersGrid.vue'
import { type PostTypeType } from '@zod/generated'
import { usePostListViewModel } from '../composables/usePostListViewModel'

defineOptions({ inheritAttrs: false })

interface Props {
  title?: string
  type?: PostTypeType
  scope: 'all' | 'nearby' | 'recent' | 'my'
  shouldFetch: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Posts',
  scope: 'all',
  shouldFetch: true,
})

const emit = defineEmits<{
  (e: 'intent:fullview', post: any): void
  (e: 'intent:edit', post: any): void
  (e: 'intent:close'): void
  (e: 'intent:hide', post: any): void
  (e: 'intent:delete', post: any): void
  (e: 'intent:saved', post: any): void
}>()

const {
  postStore,
  posts,
  isLoadingMore,
  hasMorePosts,
  isInitialized,
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
</script>

<template>
  <div class="post-list h-100 d-flex flex-column">
    <BContainer v-if="postStore.isLoading && posts.length === 0">
      <PostPlaceholdersGrid />
    </BContainer>
    <div
      v-else-if="postStore.error"
      class="text-danger mb-2 flex-shrink-0"
    >
      <p>{{ postStore.error }}</p>
      <BButton
        variant="warning"
        @click="handleRetry"
        class="btn btn-primary"
      >
        {{ $t('uicomponents.error.retry') }}
      </BButton>
    </div>

    <div
      v-else-if="posts.length === 0"
      class="d-flex align-items-center justify-content-center flex-grow-1"
    >
      <slot name="empty">
        <p class="text-muted mb-0">{{ $t('posts.messages.no_posts') }}</p>
      </slot>
    </div>

    <div
      ref="scrollContainer"
      class="container-fluid overflow-auto hide-scrollbar flex-grow-1 flex-shrink-1"
    >
      <BRow
        v-if="posts.length > 0"
        cols="1"
        cols-sm="2"
        cols-lg="3"
        class="g-2 g-md-3"
        v-bind="$attrs"
      >
        <BCol
          v-for="post in posts"
          :key="post.id"
        >
          <PostCard
            :post="post"
            :show-details="false"
            :dim-hidden="scope === 'my'"
            :show-owner-toolbar="scope === 'my'"
            @click="() => handlePostClick(post)"
            @edit="() => handlePostEdit(post)"
            @hide="() => handlePostHide(post)"
            @delete="() => handlePostDelete(post)"
            class="clickable"
          />
        </BCol>
      </BRow>
    </div>

    <div
      v-if="isLoadingMore"
      class="text-center py-3"
    >
      <BSpinner
        small
        variant="primary"
      />
      <span class="ms-2 text-muted">{{ $t('uicomponents.loading.loading') }}</span>
    </div>
  </div>
</template>

<style scoped></style>
