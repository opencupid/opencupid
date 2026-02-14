<script setup lang="ts">
import { computed } from 'vue'
import type { PublicProfile } from '@zod/profile/profile.dto'
import OsmPoiMap, { type MapItem } from '@/features/shared/ui/OsmPoiMap.vue'
import ProfileCardComponent from './ProfileCardComponent.vue'

const props = defineProps<{
  profiles: PublicProfile[]
  selectedId?: string
}>()

const emit = defineEmits<{
  (e: 'profile:select', id: string): void
}>()

// Transform profiles to MapItem format
const mapItems = computed<(PublicProfile & MapItem)[]>(() => {
  return props.profiles.map(profile => ({
    ...profile,
    lat: profile.location?.lat ?? null,
    lon: profile.location?.lon ?? null,
  }))
})

// Wrapper component for the profile card in popup
const ProfilePopupWrapper = {
  props: ['item'],
  emits: ['click'],
  components: { ProfileCardComponent },
  template: `
    <ProfileCardComponent
      :profile="item"
      :showTags="true"
      :showLocation="true"
      @click="$emit('click')"
    />
  `
}
</script>

<template>
  <OsmPoiMap
    :items="mapItems"
    :selectedId="selectedId"
    :popupComponent="ProfilePopupWrapper"
    @item:select="(id) => $emit('profile:select', id as string)"
  />
</template>
