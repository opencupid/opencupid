<script setup lang="ts">
// A profile's map marker (avatar + match heart) outside the map, so avatars in
// lists look exactly like the markers on the map. Renders the same HTML the
// map's Leaflet DivIcons use; size it from the parent (e.g. width/height).
import { computed } from 'vue'
import type { ImageVariant } from '@zod/image/image.dto'
import { useProfilePhotoAccess } from '@/features/images/composables/useProfilePhotoAccess'
import { renderHiddenProfileMarkerHtml, renderProfileMarkerHtml } from './profileMarkerIcon'

const props = defineProps<{
  profile: {
    id: string
    profileImages: { variants: ImageVariant[]; blurhash?: string | null }[]
  }
  highlighted?: boolean
}>()

const { canSeePhotosOf } = useProfilePhotoAccess()

const html = computed(() => {
  const photo = props.profile.profileImages[0]
  const image = photo
    ? { blurhash: photo.blurhash, url: photo.variants.find((v) => v.size === 'thumb')?.url }
    : undefined
  const render = canSeePhotosOf(props.profile)
    ? renderProfileMarkerHtml
    : renderHiddenProfileMarkerHtml
  return render({ image, isSelected: false, isHighlighted: props.highlighted ?? false })
})
</script>

<template>
  <div
    class="profile-marker-host"
    v-html="html"
  ></div>
</template>

<style scoped>
.profile-marker-host {
  width: 2.5rem;
  height: 2.5rem;
}
</style>
