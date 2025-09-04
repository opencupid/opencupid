<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import PostList from '../components/PostList.vue'
import PostEdit from '../components/PostEdit.vue'
import IconPencil2 from '@/assets/icons/interface/pencil-2.svg'

import type { OwnerPost } from '@zod/post/post.dto'

const { t } = useI18n()

const activeTab = ref('all')
const showCreateModal = ref(false)
const locationPermission = ref(false)
const userLocation = ref<{ lat: number; lon: number } | null>(null)

const tabs = computed(() => [
  { key: 'all', label: t('posts.filters.all') },
  { key: 'nearby', label: t('posts.filters.nearby') },
  { key: 'recent', label: t('posts.filters.recent') },
  { key: 'my', label: t('posts.my_posts') },
])

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
      enableHighAccuracy: true,
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
  // The post store will handle updating the lists automatically
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
</script>

<template>
  <main class="w-100 position-relative overflow-hidden">
    <div
      v-if="isDetailView"
      class="detail-view position-absolute w-100 h-100"
      :class="{ active: isDetailView }"
    ></div>

    <!-- <h1>{{ $t('posts.title') }}</h1> -->

    <BCard no-body>
      <div class="d-flex align-items-center justify-content-between p-2">
        <BTabs pills>
          <BTab
            v-for="tab in tabs"
            :key="tab.key"
            :title="tab.label"
            @click="activeTab = tab.key"
          />
        </BTabs>
      </div>
    </BCard>

    <div class="posts-view__content">
      <!-- All Posts Tab -->
      <div v-if="activeTab === 'all'" class="tab-content">
        <PostList
          scope="all"
          :show-filters="true"
          :empty-message="$t('posts.messages.no_posts')"
        />
      </div>

      <!-- Nearby Posts Tab -->
      <div v-else-if="activeTab === 'nearby'" class="tab-content">
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
        />
      </div>

      <!-- Recent Posts Tab -->
      <div v-else-if="activeTab === 'recent'" class="tab-content">
        <PostList
          scope="recent"
          :show-filters="true"
          :empty-message="$t('posts.messages.no_recent')"
        />
      </div>

      <!-- My Posts Tab -->
      <div v-else-if="activeTab === 'my'" class="tab-content">
        <PostList
          scope="my"
          :show-filters="true"
          :empty-message="$t('posts.messages.no_my_posts')"
        />
      </div>
    </div>

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
    <!-- Create Post Modal -->
    <!-- <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
      <div class="modal-content" @click.stop>
        <PostEdit @cancel="closeCreateModal" @saved="handlePostCreated" />
      </div>
    </div> -->
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
</style>
