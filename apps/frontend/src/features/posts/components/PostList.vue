<script setup lang="ts">
import { ref } from 'vue'
import { useInfiniteScroll } from '@vueuse/core'

import PostCard from './PostCardPostIt.vue'
import PostEdit from './PostEdit.vue'
import PostFullView from './PostFullView.vue'
import { type PostTypeType } from '@zod/generated'

import { usePostListViewModel } from '../composables/usePostListViewModel'

interface Props {
  title?: string
  type?: PostTypeType
  showFilters?: boolean
  scope?: 'all' | 'nearby' | 'recent' | 'my'
  nearbyParams?: { lat: number; lon: number; radius: number }
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Posts',
  showFilters: true,
  scope: 'all',
  emptyMessage: 'No posts found',
})

const {
  postStore,
  posts,
  selectedType,
  isLoadingMore,
  hasMorePosts,
  isInitialized,
  showFullView,
  showEditModal,
  selectedPost,
  editingPost,
  handleTypeFilter,
  handleLoadMore,
  handleRetry,
  handlePostClick,
  handlePostEdit,
  handlePostDelete,
  handlePostSaved,
  closeFullView,
  closeEditModal,
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
</script>

<template>
  <div ref="scrollContainer" class="post-list overflow-auto">
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <BFormGroup v-if="showFilters">
          <BFormSelect v-model="selectedType" @change="handleTypeFilter">
            <option value="">{{ $t('posts.filters.all') }}</option>
            <option value="OFFER">{{ $t('posts.filters.offers') }}</option>
            <option value="REQUEST">{{ $t('posts.filters.requests') }}</option>
          </BFormSelect>
        </BFormGroup>
      </div>
      <div>
        <!-- add viewModeTogglee -->
         <!-- <ViewModeToggler/> -->
      </div>
    </div>

    <div v-if="postStore.isLoading && posts.length === 0" class="post-list__loading">
      <div class="loading-spinner"></div>
      <p>{{ $t('uicomponents.loading.loading') }}</p>
    </div>

    <div v-else-if="postStore.error" class="post-list__error">
      <p>{{ postStore.error }}</p>
      <BButton variant="warning" @click="handleRetry" class="btn btn-primary">
        {{ $t('uicomponents.error.retry') }}
      </BButton>
    </div>

    <div v-else-if="posts.length === 0" class="post-list__empty">
      <p>{{ emptyMessage }}</p>
    </div>

    <BRow v-else class="cols-4 g-4 pt-4 ps-2">
      <BCol v-for="post in posts" :key="post.id">
        <PostCard
          :post="post"
          @click="handlePostClick"
          @edit="handlePostEdit"
          @delete="handlePostDelete"
        />
      </BCol>
    </BRow>

    <div v-if="isLoadingMore" class="text-center py-3">
      <BSpinner small variant="primary" />
      <span class="ms-2 text-muted">{{ $t('uicomponents.loading.loading') }}</span>
    </div>
  
    <!-- Post Full View Modal -->
    <div v-if="showFullView && selectedPost" class="modal-overlay" @click="closeFullView">
      <div class="modal-content" @click.stop>
        <PostFullView
          :post="selectedPost"
          @close="closeFullView"
          @edit="handlePostEdit"
          @delete="handlePostDelete"
        />
      </div>
    </div>

    <!-- Post Edit Modal -->
    <div v-if="showEditModal && editingPost" class="modal-overlay" @click="closeEditModal">
      <div class="modal-content" @click.stop>
        <PostEdit
          :post="editingPost"
          :is-edit="true"
          @cancel="closeEditModal"
          @saved="handlePostSaved"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.post-list {
  width: 100%;
}

.post-list__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.post-list__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.post-list__filters {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.filter-select {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

.post-list__loading {
  text-align: center;
  padding: 3rem;
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.post-list__error {
  text-align: center;
  padding: 3rem;
  color: #dc2626;
}

.post-list__empty {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.post-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .post-list__grid {
    grid-template-columns: 1fr;
  }

  .post-list__header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
