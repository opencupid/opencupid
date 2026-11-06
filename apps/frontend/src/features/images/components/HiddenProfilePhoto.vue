<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import IconHide from '@/assets/icons/interface/hide.svg'
import BlurhashCanvas from './BlurhashCanvas.vue'

/**
 * Stand-in for a profile photo the viewer may not see (see useProfilePhotoAccess).
 * Its blurhash with a small crossed-eye icon in a corner (`iconCorner`).
 */
withDefaults(
  defineProps<{
    photo: { blurhash?: string | null }
    className?: string
    iconCorner?: 'top-left' | 'bottom-right'
  }>(),
  { iconCorner: 'top-left' }
)

const emit = defineEmits<{ load: [] }>()

const { t } = useI18n()

// There is nothing to download; report it as loaded right away so callers that
// fade in on load (e.g. ProfileCardComponent) show it.
onMounted(() => emit('load'))
</script>

<template>
  <div
    :class="['hidden-profile-photo', className]"
    :title="t('profiles.photo_hidden_no_face')"
    role="img"
    :aria-label="t('profiles.photo_hidden_no_face')"
    data-testid="hidden-profile-photo"
  >
    <BlurhashCanvas
      v-if="photo.blurhash"
      :blurhash="photo.blurhash"
      class="hidden-profile-photo-blur"
    />
    <IconHide :class="['hidden-profile-photo-icon', `icon-${iconCorner}`]" />
  </div>
</template>

<style scoped>
/* No `position` here: containers such as Bootstrap's .ratio position their child
   absolutely, and overriding that pushes the placeholder out of the box.
   The blurhash and icon are stacked in a single grid cell instead. */
.hidden-profile-photo {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template: minmax(0, 1fr) / minmax(0, 1fr);
  overflow: hidden;
  object-fit: cover;
  /* Grid items honour z-index, and Leaflet sets `.leaflet-map-pane canvas { z-index: 100 }`.
     Isolate so the blurhash canvas can't paint over siblings such as the map card overlay. */
  isolation: isolate;
  background-color: var(--bs-secondary-bg);
}
.hidden-profile-photo > * {
  grid-area: 1 / 1;
}
.hidden-profile-photo-blur {
  width: 100%;
  height: 100%;
  min-height: 0;
}
.hidden-profile-photo-icon {
  width: 10%;
  height: auto;
  margin: 4%;
  color: #fff;
  opacity: 0.85;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
}
.icon-top-left {
  place-self: start;
}
/* Used by the full-width profile view, where 10% would be oversized. */
.icon-bottom-right {
  place-self: end;
  width: 5%;
}
</style>
