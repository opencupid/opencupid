<script setup lang="ts">
import { onMounted, provide } from 'vue'
import { useI18n } from 'vue-i18n'
import PostList from '../components/PostList.vue'
import PostEdit from '../components/PostEdit.vue'
import PostFullView from '../components/PostFullView.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons'

import { usePostsViewModel } from '../composables/usePostsViewModel'

const { t } = useI18n()

const {
  activeTab,
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
      <BTabs v-model="activeTab" lazy class="flex-grow-1 d-flex flex-column" nav-class="post-tabs px-2 pt-2">
        <!-- All posts -->
        <BTab id="all" :title="t('posts.filters.all')" lazy>
          <PostList
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
        </BTab>

        <!-- Nearby -->
        <BTab id="nearby" :title="t('posts.filters.nearby')" lazy>
          <div v-if="!locationPermission" class="location-prompt">
            <p>{{ $t('posts.location.prompt') }}</p>
            <BButton variant="info" @click="requestLocation" size="lg">
              {{ $t('posts.location.enable') }}
            </BButton>
          </div>
          <PostList
            v-else
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
        </BTab>

        <!-- Recent Posts -->
        <BTab id="recent" :title="t('posts.filters.recent')" lazy>
          <PostList
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
        </BTab>

        <!-- My Posts -->
        <BTab id="my" :title="t('posts.my_posts')" lazy>
          <PostList
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
</style>
