<script setup lang="ts">
import { computed, onMounted, provide } from 'vue'
import { useI18n } from 'vue-i18n'
import PostList from '../components/PostList.vue'
import PostEdit from '../components/PostEdit.vue'
import PostFullView from '../components/PostFullView.vue'
import PostMapCard from '../components/PostMapCard.vue'
import OsmPoiMap from '@/features/shared/components/OsmPoiMap.vue'
import ViewModeToggler from '@/features/shared/ui/ViewModeToggler.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons'
import { usePostStore } from '../stores/postStore'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'

import { usePostsViewModel } from '../composables/usePostsViewModel'

const { t } = useI18n()

const {
  activeTab,
  viewMode,
  showCreateModal,
  locationPermission,
  nearbyParams,
  isDetailView,
  showFullView,
  editingPost,
  selectedPost,
  ownerProfile,
  initialize,
  requestLocation,
  handlePostListIntent,
} = usePostsViewModel()

// Provide the ownerProfile object (current user's profile) to child components
provide('ownerProfile', ownerProfile)

const postStore = usePostStore()

// Get the posts for the active tab for map display
const currentTabPosts = computed(() => {
  if (activeTab.value === 'my') {
    return postStore.myPosts
  }
  return postStore.posts
})

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

const getPostTitle = (post: PublicPostWithProfile | OwnerPost) => {
  const hasProfileData = (p: PublicPostWithProfile | OwnerPost): p is PublicPostWithProfile => 'postedBy' in p && p.postedBy != null
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
      <!-- Filter controls with view mode toggler -->
      <div class="filter-controls mx-3 my-2">
        <div class="d-flex align-items-center justify-content-end w-100 px-2 py-1 bg-light rounded">
          <ViewModeToggler v-model="viewMode" />
        </div>
      </div>

      <BTabs v-model="activeTab" lazy class="flex-grow-1 d-flex flex-column" nav-class="post-tabs px-2 pt-2">
        <!-- All posts -->
        <BTab id="all" :title="t('posts.filters.all')" lazy>
          <PostList
            v-if="viewMode === 'grid'"
            scope="all"
            :is-active="activeTab === 'all'"
            :show-filters="true"
            :empty-message="$t('posts.messages.no_posts')"
            @intent:fullview="post => handlePostListIntent('fullview', post)"
            @intent:edit="post => handlePostListIntent('edit', post)"
            @intent:close="() => handlePostListIntent('close')"
            @intent:hide="post => handlePostListIntent('hide', post)"
            @intent:delete="post => handlePostListIntent('delete', post)"
            @intent:saved="post => handlePostListIntent('saved', post)"
          />
          <OsmPoiMap
            v-else-if="viewMode === 'map'"
            :items="currentTabPosts"
            :get-location="getPostLocation"
            :get-title="getPostTitle"
            :popup-component="PostMapCard"
            class="map-view h-100"
            @item:select="(id) => handlePostListIntent('fullview', currentTabPosts.find(p => p.id === id))"
          />
        </BTab>

        <!-- Nearby -->
        <BTab id="nearby" :title="t('posts.filters.nearby')" lazy>
          <div v-if="!locationPermission" class="location-prompt">
            <p>{{ $t('posts.location.prompt') }}</p>
            <BButton variant="info" @click="requestLocation" size="lg">
              {{ $t('posts.location.enable') }}
            </BButton>
          </div>
          <template v-else>
            <PostList
              v-if="viewMode === 'grid'"
              scope="nearby"
              :is-active="activeTab === 'nearby'"
              :nearby-params="nearbyParams"
              :show-filters="true"
              :empty-message="$t('posts.messages.no_nearby')"
              @intent:fullview="post => handlePostListIntent('fullview', post)"
              @intent:edit="post => handlePostListIntent('edit', post)"
              @intent:close="() => handlePostListIntent('close')"
              @intent:hide="post => handlePostListIntent('hide', post)"
              @intent:delete="post => handlePostListIntent('delete', post)"
              @intent:saved="post => handlePostListIntent('saved', post)"
            />
            <OsmPoiMap
              v-else-if="viewMode === 'map'"
              :items="currentTabPosts"
              :get-location="getPostLocation"
              :get-title="getPostTitle"
              :popup-component="PostMapCard"
              class="map-view h-100"
              @item:select="(id) => handlePostListIntent('fullview', currentTabPosts.find(p => p.id === id))"
            />
          </template>
        </BTab>

        <!-- Recent Posts -->
        <BTab id="recent" :title="t('posts.filters.recent')" lazy>
          <PostList
            v-if="viewMode === 'grid'"
            scope="recent"
            :is-active="activeTab === 'recent'"
            :show-filters="true"
            :empty-message="$t('posts.messages.no_recent')"
            @intent:fullview="post => handlePostListIntent('fullview', post)"
            @intent:edit="post => handlePostListIntent('edit', post)"
            @intent:close="() => handlePostListIntent('close')"
            @intent:hide="post => handlePostListIntent('hide', post)"
            @intent:delete="post => handlePostListIntent('delete', post)"
            @intent:saved="post => handlePostListIntent('saved', post)"
          />
          <OsmPoiMap
            v-else-if="viewMode === 'map'"
            :items="currentTabPosts"
            :get-location="getPostLocation"
            :get-title="getPostTitle"
            :popup-component="PostMapCard"
            class="map-view h-100"
            @item:select="(id) => handlePostListIntent('fullview', currentTabPosts.find(p => p.id === id))"
          />
        </BTab>

        <!-- My Posts -->
        <BTab id="my" :title="t('posts.my_posts')" lazy>
          <PostList
            v-if="viewMode === 'grid'"
            scope="my"
            :is-active="activeTab === 'my'"
            :show-filters="true"
            :empty-message="$t('posts.messages.no_my_posts')"
            @intent:fullview="post => handlePostListIntent('fullview', post)"
            @intent:edit="post => handlePostListIntent('edit', post)"
            @intent:close="() => handlePostListIntent('close')"
            @intent:hide="post => handlePostListIntent('hide', post)"
            @intent:delete="post => handlePostListIntent('delete', post)"
            @intent:saved="post => handlePostListIntent('saved', post)"
          />
          <OsmPoiMap
            v-else-if="viewMode === 'map'"
            :items="currentTabPosts"
            :get-location="getPostLocation"
            :get-title="getPostTitle"
            :popup-component="PostMapCard"
            class="map-view h-100"
            @item:select="(id) => handlePostListIntent('fullview', currentTabPosts.find(p => p.id === id))"
          />
        </BTab>
      </BTabs>
    </div>

    <!-- Create Post Button -->
    <div class="main-edit-button">
      <BButton
        size="lg"
        class="btn-icon-lg"
        key="save"
        @click="post => handlePostListIntent('create')"
        variant="primary"
        :title="$t('profiles.forms.edit_button_hint')"
      >
        <FontAwesomeIcon :icon="faPenToSquare" />
      </BButton>
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
      :no-close-on-esc="true"
      body-class="d-flex flex-column align-items-center justify-content-center overflow-auto hide-scrollbar p-2 p-md-5"
      :keyboard="false"
      @close="handlePostListIntent('close')"
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

.main-edit-button {
  position: fixed;
  z-index: 1000;
  bottom: 1.5rem;
  right: 1.5rem;
}

.list-view {
  height: calc(100vh - $navbar-height);
}

:deep(.post-tabs) {
  font-size: 0.85rem;
  gap: 0.25rem;

  .nav-link {
    color: $social;
    padding: 0.35rem 0.75rem;
    border-radius: 0.5rem;
    font-weight: 500;

    &:hover {
      background-color: transparentize($social, 0.9);
    }

    &.active {
      background-color: $social;
      color: $white;
    }
  }
}

:deep(.tab-content) {
  flex-grow: 1;
  overflow: hidden;
}
:deep(.tab-content .tab-pane) {
  height: 100%;
  overflow: hidden;
}

.map-view {
  min-height: 500px;
}

.filter-controls {
  [data-bs-theme='dark'] & {
    .bg-light {
      background-color: var(--bs-gray-800) !important;
    }
  }
}
</style>
