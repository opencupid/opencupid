<script setup lang="ts">
import { ref, watchEffect } from 'vue'

import ImageTag from './ImageTag.vue'
import { type ImageVariant } from '@zod/profile/profileimage.dto'
import { type VariantName } from './types'

// Props & Emits
const props = defineProps<{
  variant?: VariantName
  profile: {
    profileImages: { variants: ImageVariant[] }[]
  }
}>()

const image = ref<{ variants: ImageVariant[] }>()

watchEffect(() => {
  if (props.profile && props.profile.profileImages && props.profile.profileImages.length > 0) {
    image.value = props.profile.profileImages[0]
  }
})
</script>

<template>
  <ImageTag
    :image="image"
    v-if="image"
    className="img-fluid rounded"
    :variant="props.variant"
  />
</template>
