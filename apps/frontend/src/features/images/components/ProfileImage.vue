<script setup lang="ts">
import { ref, watchEffect } from 'vue'

import ImageTag from './ImageTag.vue'

// Props & Emits
const props = defineProps<{
  profile: {
    profileImages: { variants: { size: string; url: string }[] }[]
  }
}>()

const image = ref<{ variants: { size: string; url: string }[] }>()

watchEffect(() => {
  if (props.profile && props.profile.profileImages && props.profile.profileImages.length > 0) {
    image.value = props.profile.profileImages[0]
  }
})
</script>

<template>
  <ImageTag :image="image" v-if="image" className="img-fluid rounded" />
</template>
