<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'

import ImageTag from './ImageTag.vue'
import HiddenProfilePhoto from './HiddenProfilePhoto.vue'
import { type ImageVariant } from '@zod/image/image.dto'
import { type VariantName } from './types'
import { useProfilePhotoAccess } from '../composables/useProfilePhotoAccess'

// Props & Emits
const props = defineProps<{
  variant?: VariantName
  profile: {
    id: string
    profileImages: { variants: ImageVariant[]; blurhash?: string | null }[]
  }
}>()

const emit = defineEmits<{ load: [] }>()

const image = ref<{ variants: ImageVariant[]; blurhash?: string | null }>()

watchEffect(() => {
  if (props.profile && props.profile.profileImages && props.profile.profileImages.length > 0) {
    image.value = props.profile.profileImages[0]
  }
})

const { canSeePhotosOf } = useProfilePhotoAccess()
const isHidden = computed(() => !canSeePhotosOf(props.profile))
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
    @load="emit('load')"
  />
</template>
