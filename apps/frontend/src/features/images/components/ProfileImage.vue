<script setup lang="ts">
import { ref, watchEffect } from 'vue'

import ImageTag from './ImageTag.vue'
import { ImageVariant } from '@zod/profile/profileimage.dto';

// Props & Emits
const props = defineProps<{
  variant?: 'thumb' | 'card' | 'profile' | 'full'
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
  <ImageTag :image="image" v-if="image" className="img-fluid rounded" :variant="props.variant" />
</template>
