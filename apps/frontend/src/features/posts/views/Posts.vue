<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PostList from '../components/PostList.vue'
import PostEdit from '../components/PostEdit.vue'
import PostFullView from '../components/PostFullView.vue'
import { usePostStore } from '../stores/postStore'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons'

const { t } = useI18n()
const postStore = usePostStore()

const activeTab = ref('all')
const showCreateModal = ref(false)
const locationPermission = ref(false)
const userLocation = ref<{ lat: number; lon: number } | null>(null)

const nearbyParams = computed(() => {
  if (!userLocation.value) {
    return { lat: 0, lon: 0, radius: 50 }
  }
  return {
    lat: userLocation.value.lat,
    lon: userLocation.value.lon,
    radius: 50,
  }
})

const requestLocation = async () => {
  try {
    const position = await getCurrentPosition()
    userLocation.value = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
    }
    locationPermission.value = true
  } catch (error) {
    console.error('Failed to get location:', error)
    // Handle error - maybe show a message to the user
  }
}

const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 300000, // 5 minutes
    })
  })
}

// Request location only when the Nearby tab is activated
watch(activeTab, (newTab) => {
  if (newTab === 'nearby' && !locationPermission.value) {
    requestLocation()
  }
})

const isDetailView = ref(false)
const showFullView = ref(false)
const editingPost = ref(null)
const selectedPost = ref(null)

function closePostOverlays() {
  showFullView.value = false
  showCreateModal.value = false
  editingPost.value = null
  selectedPost.value = null
}

async function handleDelete(post?: any) {
  if (!post || !confirm(t('posts.messages.confirm_delete'))) {
    return
  }

  const success = await postStore.deletePost(post.id)
  if (success) {
    closePostOverlays()
  }
}

async function handleHide(post?: any) {
  if (!post) {
    return
  }

  const isVisible = post?.isVisible !== false
  const updatedPost = isVisible
    ? await postStore.hidePost(post.id)
    : await postStore.showPost(post.id)

  if (updatedPost) {
    closePostOverlays()
  }
}

async function handlePostListIntent(event: string, post?: any) {
  switch (event) {
    case 'fullview':
      selectedPost.value = post
      editingPost.value = null
      showCreateModal.value = false
      showFullView.value = true
      break
    case 'create':
      editingPost.value = null
      showCreateModal.value = true
      showFullView.value = true
      break
    case 'edit':
      editingPost.value = post
      showCreateModal.value = false
      showFullView.value = true
      break
    case 'close':
      closePostOverlays()
      break
    case 'hide':
      await handleHide(post)
      break
    case 'delete':
      await handleDelete(post)
      break
    case 'saved':
      showFullView.value = false
      break
  }
}
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
