<script setup lang="ts">
import { computed } from 'vue'

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

// Show the blurhash behind the photo while it loads (same technique as the
// map pins and ImageCarousel); the loaded image paints over it.
const blurhashStyle = computed(() =>
  image.value?.blurhash
    ? {
        backgroundImage: `url(${blurhashToDataUrl(image.value.blurhash)})`,
        backgroundSize: 'cover',
      }
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
  <ImageTag
    v-else-if="image"
    :image="image"
    className="img-fluid rounded"
    :variant="props.variant"
    :style="blurhashStyle"
    @load="emit('load')"
  />
</template>
