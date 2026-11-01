<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from 'vue'

import ImageTag from './ImageTag.vue'
import HiddenProfilePhoto from './HiddenProfilePhoto.vue'
import { type ImageVariant } from '@zod/image/image.dto'
import { type VariantName } from './types'
import { useProfilePhotoAccess } from '../composables/useProfilePhotoAccess'
import { blurhashToDataUrl } from '../composables/useBlurhashDataUrl'

// Props & Emits
const props = defineProps<{
  variant?: VariantName
  profile: {
    id: string
    profileImages: { variants: ImageVariant[]; blurhash?: string | null }[]
  }
}>()

const emit = defineEmits<{ load: [] }>()

const image = computed(() => props.profile.profileImages[0])

const { canSeePhotosOf } = useProfilePhotoAccess()
const isHidden = computed(() => !canSeePhotosOf(props.profile))

// The photo stays transparent until it has loaded, with its blurhash showing
// on the wrapper behind it; it then fades in. An image already in the browser
// cache (complete on mount) is shown at once, without the fade.
const imgTag = ref<ComponentPublicInstance | null>(null)
const loaded = ref(false)
const instant = ref(false)

const syncWithCache = () => {
  const el = imgTag.value?.$el as HTMLImageElement | undefined
  instant.value = !!el?.complete && el.naturalWidth > 0
  loaded.value = instant.value
}

watch(image, () => nextTick(syncWithCache), { immediate: true })

const handleLoad = () => {
  loaded.value = true
  emit('load')
}

// Kept after load so the fade-in blends from the blurhash. The wrapper is
// rounded like the photo (see .profile-thumbnail), so it can't peek out.
const wrapperStyle = computed(() =>
  image.value?.blurhash
    ? { backgroundImage: `url(${blurhashToDataUrl(image.value.blurhash)})` }
    : undefined
)
</script>

<template>
  <HiddenProfilePhoto
    v-if="isHidden"
    :photo="image"
    className="img-fluid rounded"
    @load="emit('load')"
  />
  <div
    v-else-if="image"
    class="profile-image rounded"
    :style="wrapperStyle"
  >
    <ImageTag
      ref="imgTag"
      :image="image"
      className="img-fluid rounded"
      :class="['profile-image-photo', { loaded, instant }]"
      :variant="props.variant"
      @load="handleLoad"
    />
  </div>
</template>

<style scoped>
.profile-image {
  display: block;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
}
.profile-image-photo {
  opacity: 0;
  transition: opacity 0.3s ease-in;
}
.profile-image-photo.loaded {
  opacity: 1;
}
.profile-image-photo.instant {
  transition: none;
}
</style>
