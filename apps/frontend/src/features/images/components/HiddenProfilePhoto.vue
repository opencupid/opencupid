<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import photoHiddenUrl from '@/assets/images/app/photo-hidden.svg?url'
import IconHide from '@/assets/icons/interface/hide.svg'
import BlurhashCanvas from './BlurhashCanvas.vue'

/**
 * Stand-in for a profile photo the viewer may not see (see useProfilePhotoAccess).
 * With a photo: its blurhash with a small crossed-eye icon in the top-left corner.
 * Without one: photo-hidden.svg.
 */
const props = defineProps<{
  photo?: { blurhash?: string | null }
  className?: string
}>()

const emit = defineEmits<{ load: [] }>()

const { t } = useI18n()

// The blurhash variant has nothing to download; report it as loaded right away
// so callers that fade in on load (e.g. ProfileCardComponent) show it.
onMounted(() => {
  if (props.photo) emit('load')
})
</script>

<template>
  <div
    v-if="photo"
    :class="['hidden-profile-photo', className]"
    :title="t('profiles.photo_hidden')"
    role="img"
    :aria-label="t('profiles.photo_hidden')"
    data-testid="hidden-profile-photo"
  >
    <BlurhashCanvas
      v-if="photo.blurhash"
      :blurhash="photo.blurhash"
      class="hidden-profile-photo-blur"
    />
    <IconHide class="hidden-profile-photo-icon" />
  </div>
  <img
    v-else
    :src="photoHiddenUrl"
    :alt="t('profiles.photo_hidden')"
    :title="t('profiles.photo_hidden')"
    :class="['hidden-profile-photo', className]"
    data-testid="no-profile-photo"
    @load="emit('load')"
  />
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
  place-self: start;
  width: 10%;
  height: auto;
  margin: 4%;
  color: #fff;
  opacity: 0.85;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
}
</style>
