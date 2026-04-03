<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useNativeOffcanvas } from '@/features/shared/composables/useNativeOffcanvas'
import { useOffcanvasState } from '@/features/shared/composables/useOffcanvasState'
import ProfileMapCard from './ProfileMapCard.vue'
import PostMapPopup from '@/features/posts/components/PostMapPopup.vue'
import type { MapPoi } from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'

defineOptions({ name: 'BrowseOffcanvas' })

const props = defineProps<{
  activePoi: MapPoi | null
}>()

const emit = defineEmits<{
  close: []
  'view-profile': [profileId: string]
}>()

const offcanvasState = useOffcanvasState()
const offcanvasEl = ref<HTMLElement>()
const bsIsOpen = ref(false)

useNativeOffcanvas(offcanvasEl, bsIsOpen)

// Open when a POI is activated
watch(
  () => props.activePoi,
  (poi) => {
    if (poi) {
      offcanvasState.open('browse')
      bsIsOpen.value = true
    } else {
      bsIsOpen.value = false
    }
  }
)

// Close when another panel opens
watch(
  () => offcanvasState.activePanel.value,
  (panel) => {
    if (panel !== 'browse' && bsIsOpen.value) {
      bsIsOpen.value = false
    }
  }
)

// Notify parent when BS offcanvas finishes hiding
watch(bsIsOpen, (open) => {
  if (!open) {
    emit('close')
  }
})

const isPost = computed(() => props.activePoi?.type === 'post')
</script>

<template>
  <div
    ref="offcanvasEl"
    class="offcanvas offcanvas-end browse-offcanvas"
    tabindex="-1"
    aria-labelledby="browseOffcanvasLabel"
  >
    <div class="offcanvas-header border-bottom">
      <h6
        id="browseOffcanvasLabel"
        class="offcanvas-title"
      >
        {{ isPost ? 'Post' : 'Profile' }}
      </h6>
      <button
        type="button"
        class="btn-close"
        @click="bsIsOpen = false"
      />
    </div>
    <div class="offcanvas-body p-0">
      <PostMapPopup
        v-if="activePoi && isPost"
        :item="activePoi.source"
        @click="emit('view-profile', String(activePoi.source?.postedBy?.id))"
      />
      <ProfileMapCard
        v-else-if="activePoi && !isPost"
        :item="activePoi.source"
        @click="emit('view-profile', String(activePoi.id))"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.browse-offcanvas {
  width: 280px;

  @media (max-width: 575.98px) {
    width: 100vw;
  }
}
</style>
