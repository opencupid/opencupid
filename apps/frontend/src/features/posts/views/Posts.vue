<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PostList from '../components/PostList.vue'
import PostEdit from '../components/PostEdit.vue'
import PostFullView from '../components/PostFullView.vue'
import PostMapCard from '../components/PostMapCard.vue'
import MapView from '@/features/shared/components/MapView.vue'
import ViewModeToggler from '@/features/shared/ui/ViewModeToggler.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons'
import { usePostStore } from '../stores/postStore'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'
import type { PostTypeType } from '@zod/generated'

import { usePostsViewModel } from '../composables/usePostsViewModel'

const { t } = useI18n()

const {
  activeTab,
  viewMode,
  showCreateModal,
  isDetailView,
  showFullView,
  editingPost,
  selectedPost,
  ownerProfile,
  isLoading,
  initialize,
  handlePostListIntent,
} = usePostsViewModel()

// Provide the ownerProfile object (current user's profile) to child components
provide('ownerProfile', ownerProfile)

const postStore = usePostStore()

// Type filter state — owned here, passed to PostList as prop
const selectedType = ref<PostTypeType | ''>('')

// Get the posts for the active tab for map display
const currentTabPosts = computed(() => {
  if (activeTab.value === 'my') {
    return postStore.myPosts
  }
  return postStore.posts
})

const isViewLoading = computed(() => isLoading.value || postStore.isLoading)

// Functions to extract location and title from posts for the map
const getPostLocation = (post: PublicPostWithProfile | OwnerPost) => {
  if ('location' in post && post.location) {
    return {
      lat: post.location.lat ?? undefined,
      lon: post.location.lon ?? undefined,
    }
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
  <main class="w-100 position-relative overflow-hidden">
    <div
      v-if="isDetailView"
      class="detail-view position-absolute w-100 h-100"
      :class="{ active: isDetailView }"
    ></div>

    <div class="list-view d-flex flex-column">
      <!-- Unified toolbar: scope pills + type filter + view toggle -->
      <div class="posts-toolbar d-flex align-items-center gap-2 px-3 py-2 flex-shrink-0">
        <div class="scope-pills d-flex gap-1 overflow-auto hide-scrollbar flex-grow-1">
          <!-- TODO -->
          <ul class="nav nav-pills small">
            <li class="nav-item">
              <button
                type="button"
                class="nav-link py-1"
                :class="{ active: activeTab === 'all' }"
                @click="activeTab = 'all'"
              >
                {{ t('posts.filters.all') }}
              </button>
            </li>
            <li class="nav-item">
              <button
                type="button"
                class="nav-link py-1"
                :class="{ active: activeTab === 'recent' }"
                @click="activeTab = 'recent'"
              >
                {{ t('posts.filters.recent') }}
              </button>
            </li>
            <li class="nav-item">
              <button
                type="button"
                class="nav-link py-1"
                :class="{ active: activeTab === 'my' }"
                @click="activeTab = 'my'"
              >
                {{ t('posts.my_posts') }}
              </button>
            </li>
          </ul>
        </div>

        <BFormSelect
          v-model="selectedType"
          size="sm"
          class="type-filter"
        >
          <BFormSelectOption value="">{{ t('posts.filters.all') }}</BFormSelectOption>
          <BFormSelectOption value="OFFER">{{ t('posts.filters.offers') }}</BFormSelectOption>
          <BFormSelectOption value="REQUEST">{{ t('posts.filters.requests') }}</BFormSelectOption>
        </BFormSelect>

        <ViewModeToggler v-model="viewMode" />
      </div>

      <!-- Tab content -->
      <div
        class="tab-content flex-grow-1 overflow-hidden position-relative"
        :class="{ 'opacity-50': isViewLoading }"
      >
        <!-- All posts -->
        <div
          v-if="activeTab === 'all'"
          class="scope-pane h-100"
        >
          <PostList
            v-if="viewMode === 'grid'"
            scope="all"
            :is-active="activeTab === 'all'"
            :type="selectedType || undefined"
            :show-filters="false"
            :empty-message="$t('posts.messages.no_posts')"
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
        </div>

        <!-- Recent Posts -->
        <div
          v-if="activeTab === 'recent'"
          class="scope-pane h-100"
        >
          <PostList
            v-if="viewMode === 'grid'"
            scope="recent"
            :is-active="activeTab === 'recent'"
            :type="selectedType || undefined"
            :show-filters="false"
            :empty-message="$t('posts.messages.no_recent')"
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
        </div>

        <!-- My Posts -->
        <div
          v-if="activeTab === 'my'"
          class="scope-pane h-100"
        >
          <PostList
            v-if="viewMode === 'grid'"
            scope="my"
            :is-active="activeTab === 'my'"
            :type="selectedType || undefined"
            :show-filters="false"
            :empty-message="$t('posts.messages.no_my_posts')"
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
        </div>
      </div>
    </div>

    <!-- Create Post Button -->
    <div class="main-edit-button">
      <BButton
        size="lg"
        class="btn-icon-lg btn-shadow"
        key="save"
        @click="(post) => handlePostListIntent('create')"
        variant="primary"
        :title="$t('profiles.forms.edit_button_hint')"
      >
        <FontAwesomeIcon :icon="faPenToSquare" />
      </BButton>
    </div>

    <!-- Post Full View / Edit Modal -->
    <BModal
      :title="$t('posts.create_title')"
      v-if="showFullView"
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
      <!-- Post Edit Modal -->
      <template v-if="showCreateModal">
        <PostEdit
          :is-edit="false"
          @cancel="handlePostListIntent('close')"
          @saved="handlePostListIntent('saved', $event)"
        />
      </template>

      <!-- Post Edit Modal -->
      <template v-if="editingPost">
        <PostEdit
          :post="editingPost"
          :is-edit="true"
          @cancel="handlePostListIntent('close')"
          @saved="handlePostListIntent('saved', $event)"
        />
      </template>

      <!-- Post Full View Modal Content -->
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
  </main>
</template>

<style scoped lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';
@import '@/css/app-vars.scss';
@import '@/css/theme.scss';

.detail-view {
  z-index: 1050;
  height: 100dvh;
  inset: 0;

  @include media-breakpoint-up(sm) {
    top: $navbar-height;
    height: calc(100vh - $navbar-height);
    z-index: 900;
  }
}

.list-view {
  height: calc(100vh - $navbar-height);
}

.posts-toolbar {
  .scope-pills {
    -ms-overflow-style: none;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .scope-pill {
    white-space: nowrap;
    font-size: 0.85rem;
    font-weight: 500;
    color: $social;
    background: transparent;
    border: none;
    padding: 0.35rem 0.75rem;
    border-radius: 0.5rem;

    &:hover {
      background-color: transparentize($social, 0.9);
    }

    &.active {
      background-color: $social;
      color: $white;
    }
  }

  .type-filter {
    width: auto;
    min-width: 0;
    flex-shrink: 0;
    font-size: 0.85rem;
    border-color: transparent;
    background-color: transparent;
    padding-right: 1.75rem;

    &:focus {
      border-color: $social;
      box-shadow: none;
    }
  }
}

.tab-content {
  min-height: 0;
}

.scope-pane {
  overflow: hidden;
  position: absolute;
  inset: 0;
}

.map-view {
  min-height: 500px;
}
</style>
