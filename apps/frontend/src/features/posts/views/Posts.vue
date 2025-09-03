<template>
  <div class="posts-view">
    <div class="posts-view__header">
      <h1 class="posts-view__title">{{ $t('posts.title') }}</h1>
      <button @click="showCreateModal = true" class="btn btn-primary">
        {{ $t('posts.actions.create') }}
      </button>
    </div>

    <div class="posts-view__tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.key"
        @click="activeTab = tab.key"
        :class="['tab-btn', { 'tab-btn--active': activeTab === tab.key }]"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="posts-view__content">
      <!-- All Posts Tab -->
      <div v-if="activeTab === 'all'" class="tab-content">
        <PostList
          :title="$t('posts.filters.all')"
          view-mode="all"
          :show-filters="true"
          :empty-message="$t('posts.messages.no_posts')"
        />
      </div>

      <!-- Nearby Posts Tab -->
      <div v-else-if="activeTab === 'nearby'" class="tab-content">
        <div v-if="!locationPermission" class="location-prompt">
          <p>{{ $t('posts.location.prompt') }}</p>
          <button @click="requestLocation" class="btn btn-primary">
            {{ $t('posts.location.enable') }}
          </button>
        </div>
        <PostList
          v-else
          :title="$t('posts.filters.nearby')"
          view-mode="nearby"
          :nearby-params="nearbyParams"
          :show-filters="true"
          :empty-message="$t('posts.messages.no_nearby')"
        />
      </div>

      <!-- Recent Posts Tab -->
      <div v-else-if="activeTab === 'recent'" class="tab-content">
        <PostList
          :title="$t('posts.filters.recent')"
          view-mode="recent"
          :show-filters="true"
          :empty-message="$t('posts.messages.no_recent')"
        />
      </div>

      <!-- My Posts Tab -->
      <div v-else-if="activeTab === 'my'" class="tab-content">
        <PostList
          :title="$t('posts.my_posts')"
          view-mode="my"
          :show-filters="true"
          :empty-message="$t('posts.messages.no_my_posts')"
        />
      </div>
    </div>

    <!-- Create Post Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
      <div class="modal-content" @click.stop>
        <PostEdit
          @cancel="closeCreateModal"
          @saved="handlePostCreated"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import PostList from '../components/PostList.vue'
import PostEdit from '../components/PostEdit.vue'
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
    radius: 50
  }
})

const requestLocation = async () => {
  try {
    const position = await getCurrentPosition()
    userLocation.value = {
      lat: position.coords.latitude,
      lon: position.coords.longitude
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
      maximumAge: 300000 // 5 minutes
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
      (position) => {
        userLocation.value = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
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
</script>

<style scoped>
.posts-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.posts-view__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.posts-view__title {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.posts-view__tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
  overflow-x: auto;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-weight: 500;
  color: #6b7280;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-btn:hover {
  color: #374151;
}

.tab-btn--active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.posts-view__content {
  min-height: 400px;
}

.tab-content {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.location-prompt {
  text-align: center;
  padding: 3rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.location-prompt p {
  color: #6b7280;
  margin-bottom: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
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
  .posts-view {
    padding: 1rem;
  }
  
  .posts-view__header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .posts-view__title {
    font-size: 1.5rem;
  }
}
</style>