<script setup lang="ts">
import { computed, watch } from 'vue'
import { useOffcanvasState } from '@/features/shared/composables/useOffcanvasState'
import ProfileMapCard from './ProfileMapCard.vue'
import PostMapPopup from '@/features/posts/components/PostMapPopup.vue'
import type { MapPoi } from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'
import type { PublicPostWithProfile } from '@zod/post/post.dto'
import type { PublicProfile } from '@zod/profile/profile.dto'

defineOptions({ name: 'BrowseOffcanvas' })

const props = defineProps<{
  activePoi: MapPoi | null
}>()

const emit = defineEmits<{
  close: []
  'view-profile': [profileId: string]
}>()

const offcanvasState = useOffcanvasState()

// Register/deregister with shared offcanvas state
watch(
  () => props.activePoi,
  (poi) => {
    if (poi) {
      offcanvasState.open('browse')
    }
  }
)

// Close when another panel opens (user offcanvas takes over)
watch(
  () => offcanvasState.activePanel.value,
  (panel) => {
    if (panel !== 'browse' && props.activePoi) {
      emit('close')
    }
  }
)

function handleClose() {
  offcanvasState.close()
  emit('close')
}

const isPost = computed(() => props.activePoi?.type === 'post')
</script>

<template>
  <aside
    v-if="activePoi"
    class="browse-detail-panel d-flex flex-column border-end bg-white"
  >
    <div class="panel-header px-3 py-2 border-bottom d-flex align-items-center">
      <h6 class="mb-0 flex-grow-1">
        {{ isPost ? 'Post' : 'Profile' }}
      </h6>
      <button
        type="button"
        class="btn-close"
        @click="handleClose"
      />
    </div>
    <div class="panel-body flex-grow-1 overflow-auto p-0">
      <PostMapPopup
        v-if="isPost"
        :item="activePoi.source as PublicPostWithProfile"
        @click="
          emit('view-profile', String((activePoi.source as PublicPostWithProfile)?.postedBy?.id))
        "
      />
      <ProfileMapCard
        v-else
        :item="activePoi.source as PublicProfile"
        @click="emit('view-profile', String(activePoi.id))"
      />
    </div>
  </aside>
</template>

<style scoped lang="scss">
.browse-detail-panel {
  width: 280px;
  min-width: 280px;
  height: 100%;

  @media (max-width: 575.98px) {
    position: absolute;
    inset: 0;
    width: 100vw;
    z-index: 1020;
  }
}
</style>
