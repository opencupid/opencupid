<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { BButton, BButtonGroup } from 'bootstrap-vue-next'
import { useMapStore } from '../stores/mapStore'
import { useI18n } from '@/lib/i18n'

const { t } = useI18n()
const mapStore = useMapStore()
const { showPeople, showPosts } = storeToRefs(mapStore)

function toggle(layer: 'people' | 'posts') {
  if (layer === 'people') {
    if (showPeople.value && !showPosts.value) return
    mapStore.setShowPeople(!showPeople.value)
  } else {
    if (showPosts.value && !showPeople.value) return
    mapStore.setShowPosts(!showPosts.value)
  }
}
</script>

<template>
  <div class="map-layer-control">
    <BButtonGroup
      size="sm"
      :aria-label="t('map.layer_control.aria_label')"
    >
      <BButton
        :pressed="showPeople"
        :variant="showPeople ? 'primary' : 'outline-secondary'"
        @click="toggle('people')"
      >
        <i class="bi bi-people-fill" /> {{ t('map.layer_control.people') }}
      </BButton>
      <BButton
        :pressed="showPosts"
        :variant="showPosts ? 'primary' : 'outline-secondary'"
        @click="toggle('posts')"
      >
        <i class="bi bi-chat-dots-fill" /> {{ t('map.layer_control.posts') }}
      </BButton>
    </BButtonGroup>
  </div>
</template>

<style scoped>
.map-layer-control {
  user-select: none;
}
</style>
