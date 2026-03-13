<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons'

import BrowseLayout from '@/features/shared/components/BrowseLayout.vue'
import PostFilterBar from '../components/PostFilterBar.vue'
import PostList from '../components/PostList.vue'
import PostEdit from '../components/PostEdit.vue'
import PostFullView from '../components/PostFullView.vue'
import PostMapCard from '../components/PostMapCard.vue'
import MapView from '@/features/shared/components/MapView.vue'
import ViewModeToggler from '@/features/shared/ui/ViewModeToggler.vue'

import { usePostsViewModel } from '../composables/usePostsViewModel'
import { usePostStore } from '../stores/postStore'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'
import type { PostTypeType } from '@zod/generated'
import type { LocationDTO } from '@zod/dto/location.dto'

defineOptions({ name: 'BrowsePosts' })

const { t } = useI18n()

const {
  activeTab,
  viewMode,
  showCreateModal,
  showFullView,
  editingPost,
  selectedPost,
  ownerProfile,
  isLoading,
  isInitialized,
  initialize,
  handlePostListIntent,
} = usePostsViewModel()

provide('ownerProfile', ownerProfile)

const postStore = usePostStore()

const selectedType = ref<PostTypeType | ''>('')
const filterLocation = ref<LocationDTO>({ country: '' })

const currentTabPosts = computed(() => {
  if (activeTab.value === 'my') return postStore.myPosts
  return postStore.posts
})

const isViewLoading = computed(() => isLoading.value || postStore.isLoading)
const haveResults = computed(() => currentTabPosts.value.length > 0)

const getPostLocation = (post: PublicPostWithProfile | OwnerPost) => {
  if ('location' in post && post.location?.lat != null && post.location?.lon != null) {
    return { lat: post.location.lat, lon: post.location.lon }
  }
  return undefined
}

const getPostImage = (post: PublicPostWithProfile | OwnerPost) => {
  if ('postedBy' in post && post.postedBy) {
    return post.postedBy.profileImages?.[0]
  }
  return undefined
}

const getPostTitle = (post: PublicPostWithProfile | OwnerPost) => {
  const hasProfileData = (p: PublicPostWithProfile | OwnerPost): p is PublicPostWithProfile =>
    'postedBy' in p && p.postedBy != null
  if (hasProfileData(post)) {
    return `${post.postedBy.publicName}: ${post.content.substring(0, 50)}...`
  }
  return post.content.substring(0, 50)
}

onMounted(async () => {
  await initialize()
})
</script>

<template>
  <BrowseLayout
    :isLoading="isViewLoading"
    :isInitialized="isInitialized"
    :haveResults="haveResults"
  >
    <template #filter-bar>
      <PostFilterBar
        :viewer-profile="ownerProfile"
        v-model:location="filterLocation"
        v-model:scope="activeTab"
        v-model:type="selectedType"
      />
      <ViewModeToggler v-model="viewMode" />
    </template>

    <template #results>
      <PostList
        v-if="viewMode === 'grid'"
        :key="activeTab"
        :scope="activeTab"
        :is-active="true"
        :type="selectedType || undefined"
        :show-filters="false"
        :empty-message="
          activeTab === 'my'
            ? $t('posts.messages.no_my_posts')
            : activeTab === 'recent'
              ? $t('posts.messages.no_recent')
              : $t('posts.messages.no_posts')
        "
        @intent:fullview="(post) => handlePostListIntent('fullview', post)"
        @intent:edit="(post) => handlePostListIntent('edit', post)"
        @intent:close="() => handlePostListIntent('close')"
        @intent:hide="(post) => handlePostListIntent('hide', post)"
        @intent:delete="(post) => handlePostListIntent('delete', post)"
        @intent:saved="(post) => handlePostListIntent('saved', post)"
      />
      <MapView
        v-else-if="viewMode === 'map'"
        :items="currentTabPosts"
        :get-location="getPostLocation"
        :get-title="getPostTitle"
        :get-image="getPostImage"
        :popup-component="PostMapCard"
        :is-loading="isViewLoading"
        class="h-100"
        @item:select="
          (id) =>
            handlePostListIntent(
              'fullview',
              currentTabPosts.find((p) => p.id === id)
            )
        "
      />
    </template>

    <template #floating>
      <!-- Create Post Button -->
      <div class="main-edit-button">
        <BButton
          size="lg"
          class="btn-icon-lg btn-shadow"
          variant="primary"
          :title="t('posts.actions.create')"
          @click="handlePostListIntent('create')"
        >
          <FontAwesomeIcon :icon="faPenToSquare" />
        </BButton>
      </div>
    </template>
  </BrowseLayout>

  <!-- Post Full View / Edit Modal -->
  <BModal
    v-if="showFullView"
    :title="t('posts.create_title')"
    :backdrop="true"
    centered
    size="lg"
    button-size="sm"
    fullscreen="sm"
    :focus="false"
    :no-header="false"
    :no-footer="true"
    :show="true"
    :no-close-on-esc="false"
    body-class="d-flex flex-column align-items-center justify-content-center overflow-auto hide-scrollbar p-2 p-md-2"
    @close="handlePostListIntent('close')"
    @hidden="handlePostListIntent('close')"
  >
    <template v-if="showCreateModal">
      <PostEdit
        :is-edit="false"
        @cancel="handlePostListIntent('close')"
        @saved="handlePostListIntent('saved', $event)"
      />
    </template>

    <template v-if="editingPost">
      <PostEdit
        :post="editingPost"
        :is-edit="true"
        @cancel="handlePostListIntent('close')"
        @saved="handlePostListIntent('saved', $event)"
      />
    </template>

    <template v-else-if="selectedPost">
      <PostFullView
        :post="selectedPost"
        @close="handlePostListIntent('close')"
        @edit="handlePostListIntent('edit', $event)"
        @hide="handlePostListIntent('hide', $event)"
        @delete="handlePostListIntent('delete', $event)"
      />
    </template>
  </BModal>
</template>
