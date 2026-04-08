<script setup lang="ts">
import type { MapPoi } from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'
import PostMarker from '@/features/posts/components/PostMarker.vue'

defineOptions({ name: 'PostsSidebar' })

defineProps<{
  posts: MapPoi[]
  activeId?: string | number | null
}>()

const emit = defineEmits<{
  select: [poi: MapPoi]
}>()
</script>

<template>
  <aside class="posts-sidebar d-none d-md-flex flex-column border-end bg-white">
    <div class="sidebar-header px-2 py-2 border-bottom">
      <span class="small fw-semibold text-muted">Posts</span>
    </div>
    <div
      class="sidebar-body overflow-y-auto flex-grow-1 p-1 d-flex flex-column gap-1 align-items-center"
    >
      <button
        v-for="poi in posts"
        :key="poi.id"
        class="thumb-cell rounded border-0 p-0 overflow-hidden flex-shrink-0"
        :class="{ active: poi.id === activeId }"
        @click="emit('select', poi)"
      >
        <img
          v-if="poi.image?.variants?.length"
          :src="
            poi.image.variants.find((v) => v.size === 'thumb')?.url ?? poi.image.variants[0]?.url
          "
          :alt="poi.title"
          class="w-100 h-100 object-fit-cover"
        />
        <div
          v-else
          class="no-image d-flex align-items-center justify-content-center h-100 bg-light"
        >
          <PostMarker
            :is-selected="false"
            :is-highlighted="false"
          />
        </div>
      </button>
      <p
        v-if="posts.length === 0"
        class="text-muted small text-center p-2"
      >
        No posts in view
      </p>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.posts-sidebar {
  width: 80px;
  min-width: 80px;
}

.thumb-cell {
  width: 64px;
  height: 64px;
  cursor: pointer;

  &.active {
    outline: 2px solid var(--bs-dark);
    outline-offset: -2px;
  }

  &:hover:not(.active) {
    outline: 1px solid var(--bs-gray-400);
    outline-offset: -1px;
  }
}
</style>
