<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import PostList from '../components/PostList.vue'
import PostEdit from '../components/PostEdit.vue'
import PostFullView from '../components/PostFullView.vue'
import IconPencil2 from '@/assets/icons/interface/pencil-2.svg'

import type { OwnerPost, PublicPostWithProfile } from '@zod/post/post.dto'

const { t } = useI18n()

const activeTab = ref('all')
const showCreateModal = ref(false)
const locationPermission = ref(false)
const userLocation = ref<{ lat: number; lon: number } | null>(null)

// const tabs = computed(() => [
//   { key: 'all', label: t('posts.filters.all') },
//   { key: 'nearby', label: t('posts.filters.nearby') },
//   { key: 'recent', label: t('posts.filters.recent') },
//   { key: 'my', label: t('posts.my_posts') },
// ])

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

const closeCreateModal = () => {
  showCreateModal.value = false
}

const handlePostCreated = (post: OwnerPost) => {
  closeCreateModal()
}

onMounted(() => {
  // Check if we already have location permission
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        userLocation.value = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        }
        locationPermission.value = true
      },
      () => {
        locationPermission.value = false
      },
      { timeout: 1000 }
    )
  }
})

const isDetailView = ref(false)

// View mode state for toggler
const viewMode = ref('grid')

// Modal state for post full view/edit
const showFullView = ref(false)
import type { Ref } from 'vue'
const selectedPost: Ref<PublicPostWithProfile | OwnerPost | null> = ref(null)
const editingPost: Ref<PublicPostWithProfile | OwnerPost | null> = ref(null)

function handlePostListIntent(payload: { type: string; value?: any }) {
  if (payload.type === 'viewMode') {
    viewMode.value = payload.value
  }
  // You can add more intent types here, e.g. open modal, etc.
}

function openFullView(post: PublicPostWithProfile | OwnerPost) {
  selectedPost.value = post
  editingPost.value = null
  showFullView.value = true
}

function openEditModal(post: PublicPostWithProfile | OwnerPost) {
  editingPost.value = post
  selectedPost.value = null
  showFullView.value = true
}

function closeFullView() {
  showFullView.value = false
  selectedPost.value = null
  editingPost.value = null
}

function handlePostEdit(post: PublicPostWithProfile | OwnerPost) {
  openEditModal(post)
}

function handlePostClick(post: PublicPostWithProfile | OwnerPost) {
  openFullView(post)
}

function handlePostDelete(post: PublicPostWithProfile | OwnerPost) {
  // Optionally handle delete in parent
  closeFullView()
}

function handlePostSaved(post: PublicPostWithProfile | OwnerPost) {
  closeFullView()
}

function closeEditModal() {
  closeFullView()
}
</script>

<template>
  <main class="w-100 position-relative overflow-hidden">
    <div
      v-if="isDetailView"
      class="detail-view position-absolute w-100 h-100"
      :class="{ active: isDetailView }"
    ></div>

    <div class="list-view d-flex align-items-center justify-content-between p-2">
      <BTabs pills v-model="activeTab" lazy class="h-100 d-flex flex-column">
        <!-- All posts -->
        <BTab id="all" :title="t('posts.filters.all')" lazy>
          <PostList
            scope="all"
            :show-filters="true"
            :empty-message="$t('posts.messages.no_posts')"
            :view-mode="viewMode"
            @intent="handlePostListIntent"
            @edit="handlePostEdit"
            @click="handlePostClick"
            @delete="handlePostDelete"
            @saved="handlePostSaved"
            @close="closeFullView"
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
            :nearby-params="nearbyParams"
            :show-filters="true"
            :empty-message="$t('posts.messages.no_nearby')"
            :view-mode="viewMode"
            @intent="handlePostListIntent"
            @edit="handlePostEdit"
            @click="handlePostClick"
            @delete="handlePostDelete"
            @saved="handlePostSaved"
            @close="closeFullView"
          />
        </BTab>

        <!-- Recent Posts -->
        <BTab id="recent" :title="t('posts.filters.recent')" lazy>
          <PostList
            scope="recent"
            :show-filters="true"
            :empty-message="$t('posts.messages.no_recent')"
            :view-mode="viewMode"
            @intent="handlePostListIntent"
            @edit="handlePostEdit"
            @click="handlePostClick"
            @delete="handlePostDelete"
            @saved="handlePostSaved"
            @close="closeFullView"
          />
        </BTab>

        <!-- My Posts -->
        <BTab id="my" :title="t('posts.my_posts')" lazy>
          <PostList
            scope="my"
            :show-filters="true"
            :empty-message="$t('posts.no_my_posts')"
            :view-mode="viewMode"
            @intent="handlePostListIntent"
            @edit="handlePostEdit"
            @click="handlePostClick"
            @delete="handlePostDelete"
            @saved="handlePostSaved"
            @close="closeFullView"
          />

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
        </BTab>
      </BTabs>
    </div>

    <!-- Create Post Button -->
    <div class="main-edit-button">
      <BButton
        size="lg"
        class="btn-icon-lg"
        key="save"
        @click="showCreateModal = true"
        variant="primary"
        :title="$t('profiles.forms.edit_button_hint')"
      >
        <IconPencil2 class="svg-icon-lg" />
      </BButton>
    </div>

    <BModal
      title=""
      v-if="showCreateModal"
      :backdrop="'static'"
      centered
      size="lg"
      button-size="sm"
      fullscreen="sm"
      :focus="false"
      :no-close-on-backdrop="true"
      :no-header="true"
      :no-footer="true"
      :show="true"
      body-class="d-flex flex-column align-items-center justify-content-center overflow-auto hide-scrollbar p-2 p-md-5"
      :keyboard="false"
    >
      <PostEdit @cancel="closeCreateModal" @saved="handlePostCreated" />
    </BModal>
  </main>
</template>

<style scoped lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';
@import '@/css/app-vars.scss';

.main-edit-button {
  position: fixed;
  z-index: 5;
  bottom: 1rem;
  right: 1rem;
}

.list-view {
  height: calc(100vh - $navbar-height);
}
:deep(.tab-content) {
  height: 100%;
  overflow: hidden;
}
:deep(.tab-content .tab-pane) {
  height: 100%;
  overflow: hidden;
}
</style>
