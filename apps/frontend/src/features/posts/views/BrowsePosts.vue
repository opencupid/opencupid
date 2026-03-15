<script setup lang="ts">
import { computed, onActivated, onMounted, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons'

import BrowseLayout from '@/features/shared/components/BrowseLayout.vue'
import PostFilterBar from '../components/PostFilterBar.vue'
import PostList from '../components/PostList.vue'
import PostFullView from '../components/PostFullView.vue'
import MapView from '@/features/shared/components/MapView.vue'
import MapIcon from '../components/MapIcon.vue'
import IconMenu from '@/assets/icons/interface/menu.svg'
import ViewModeToggler from '@/features/shared/ui/ViewModeToggler.vue'

import { usePostsViewModel } from '../composables/usePostsViewModel'
import { usePostStore } from '../stores/postStore'
import type { PublicPostWithProfile } from '@zod/post/post.dto'
import type { PostTypeType } from '@zod/generated'

import type { MapPoi } from '@/features/shared/components/OsmPoiMap.types'

defineOptions({ name: 'BrowsePosts' })

const { t } = useI18n()

const {
  activeTab,
  viewMode,
  filterLocation,
  selectedPost,
  showMyPosts,
  ownerProfile,
  isLoading,
  isInitialized,
  initialize,
  onBoundsChanged,
  handleFullview,
  handleCreate,
  handleEdit,
  handleDelete,
  handleHide,
  handleSaved,
  closePostOverlays,
} = usePostsViewModel()

provide('ownerProfile', ownerProfile)

const postStore = usePostStore()

const selectedType = ref<PostTypeType | ''>('')

const currentTabPosts = computed(() => {
  if (activeTab.value === 'my') return postStore.myPosts
  return postStore.posts
})

const isViewLoading = computed(() => isLoading.value || postStore.isLoading)
const haveResults = computed(() => currentTabPosts.value.length > 0)

const mapCenter = computed<[number, number] | undefined>(() => {
  const loc = filterLocation.value
  if (loc?.lat && loc?.lon) return [loc.lat, loc.lon]
  return undefined
})

const mapPois = computed<MapPoi[]>(() =>
  (postStore.posts as PublicPostWithProfile[])
    .filter((p) => p.location?.lat != null && p.location?.lon != null)
    .map((p) => ({
      id: p.id,
      title: p.postedBy
        ? `${p.postedBy.publicName}: ${p.content.substring(0, 50)}...`
        : p.content.substring(0, 50),
      location: { lat: p.location!.lat!, lon: p.location!.lon! },
      image: p.postedBy?.profileImages?.[0],
      source: p,
    }))
)

onMounted(async () => {
  await initialize()
})

onActivated(() => {
  if (isInitialized.value) {
    postStore.loadPosts(activeTab.value)
  }
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
      <BButton
        variant="link-secondary"
        class="p-1"
        @click="showMyPosts = true"
      >
        <IconMenu class="svg-icon" />
      </BButton>
    </template>

    <template #results>
      <PostList
        v-if="viewMode === 'grid'"
        :key="activeTab"
        :scope="activeTab"
        :should-fetch="true"
        :type="selectedType || undefined"
        :show-filters="false"
        @intent:fullview="handleFullview"
        @intent:edit="handleEdit"
        @intent:close="closePostOverlays"
        @intent:hide="handleHide"
        @intent:delete="handleDelete"
        @intent:saved="handleSaved"
      >
        <template #empty>
          <p class="text-muted mb-0">{{ t('posts.messages.no_posts') }}</p>
        </template>
      </PostList>
      <MapView
        v-else-if="viewMode === 'map'"
        :items="mapPois"
        :icon-component="MapIcon"
        :center="mapCenter"
        :is-loading="isViewLoading"
        class="h-100"
        @item:select="(id) => handleFullview(currentTabPosts.find((p) => p.id === id))"
        @bounds-changed="onBoundsChanged"
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
          @click="handleCreate()"
        >
          <FontAwesomeIcon :icon="faPenToSquare" />
        </BButton>
      </div>
    </template>
  </BrowseLayout>

  <!-- Post Full View Modal -->
  <BModal
    v-if="selectedPost"
    :title="selectedPost.content.substring(0, 50)"
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
    header-class="bg-transparent border-0"
    content-class="bg-transparent border-0 shadow-none"
    body-class="d-flex flex-column align-items-center justify-content-center overflow-auto hide-scrollbar p-2 p-md-2"
    @close="closePostOverlays"
    @hidden="closePostOverlays"
  >
    <template #default>
      <PostFullView
        :post="selectedPost"
        @close="closePostOverlays"
        @edit="closePostOverlays(); handleEdit($event)"
        @hide="handleHide"
        @delete="handleDelete"
      />
    </template>
    <template #header="{ hide }">
      <BCloseButton
        @click="hide('close')"
        style="color: white"
      />
    </template>
  </BModal>

  <!-- My Posts Offcanvas -->
  <BOffcanvas
    v-model="showMyPosts"
    placement="end"
    :title="t('posts.my_posts')"
    shadow
  >
    <PostList
      scope="my"
      :should-fetch="showMyPosts"
      :show-filters="false"
      cols="1"
      cols-sm="1"
      cols-lg="1"
      @intent:fullview="handleFullview"
      @intent:edit="handleEdit"
      @intent:close="closePostOverlays"
      @intent:hide="handleHide"
      @intent:delete="handleDelete"
    >
      <template #empty>
        <p class="text-muted mb-0">{{ t('posts.messages.no_my_posts') }}</p>
      </template>
    </PostList>
    <div class="position-fixed bottom-0 end-0 p-3 text-cente w-100r" style="width: inherit">
      <BButton
        variant="primary"
        @click="handleCreate()"
      >
        {{ t('posts.actions.create') }}
      </BButton>
    </div>
  </BOffcanvas>
</template>
