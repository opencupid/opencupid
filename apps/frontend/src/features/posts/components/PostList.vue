<script setup lang="ts">
import { ref } from 'vue'
import { useInfiniteScroll } from '@vueuse/core'

import PostCard from './PostCard.vue'
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
import IconFilter from '@/assets/icons/interface/filter.svg'

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
  <div class="post-list h-100">
    <!-- Filter -->
    <div class="d-flex flex-row justify-content-end align-items-center mb-3">
      <div>
        <div v-if="showFilters">
          <BInputGroup class="mt-3">
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
      </div>
      <div>
        <!-- add viewModeTogglee -->
        <!-- <ViewModeToggler/> -->
      </div>
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

    <div ref="scrollContainer" class="container-fluid overflow-auto hide-scrollbar h-100">
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
            @click="handlePostClick"
            @edit="handlePostEdit"
            @delete="handlePostDelete"
            class="clickable"
          />
        </BCol>
      </TransitionGroup>
    </div>

    <div v-if="isLoadingMore" class="text-center py-3">
      <BSpinner small variant="primary" />
      <span class="ms-2 text-muted">{{ $t('uicomponents.loading.loading') }}</span>
    </div>

    <!-- Post Full View / Edit Modal -->
    <BModal
      title=""
      v-if="showFullView"
      :backdrop="'static'"
      centered
      size="lg"
      button-size="sm"
      fullscreen="sm"
      :focus="false"
      :no-header="false"
      :no-footer="true"
      :show="true"
      body-class="d-flex flex-column align-items-center justify-content-center overflow-auto hide-scrollbar p-2 p-md-5"
      :keyboard="false"
      @close="closeFullView"
    >
      <!-- Post Edit Modal -->
      <template v-if="editingPost">
        <PostEdit
          :post="editingPost"
          :is-edit="true"
          @cancel="closeEditModal"
          @saved="handlePostSaved"
        />
      </template>

      <!-- Post Full View Modal Content -->
      <template v-else-if="selectedPost">
        <PostFullView
          :post="selectedPost"
          @close="closeFullView"
          @edit="handlePostEdit"
          @delete="handlePostDelete"
        />
      </template>
    </BModal>
  </div>
</template>

<style scoped></style>
