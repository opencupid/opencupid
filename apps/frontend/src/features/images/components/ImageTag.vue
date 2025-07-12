<script setup lang="ts">
import { type PropType, computed } from 'vue'

const props = defineProps({
  image: {
    type: Object as PropType<{ variants: { size: string; url: string }[] }>,
    required: true,
  },
  className: {
    type: String,
    default: '',
  },
})
const findUrl = (size: string) =>
  props.image.variants.find(v => v.size === size)?.url || ''

const webpSrcset = computed(() => {
  const parts = [] as string[]
  const thumb = findUrl('thumb')
  if (thumb) parts.push(`${thumb} 150w`)
  const card = findUrl('card')
  if (card) parts.push(`${card} 480w`)
  const full = findUrl('full')
  if (full) parts.push(`${full} 1280w`)
  return parts.join(', ')
})

const originalUrl = computed(() => findUrl('original'))
</script>

<template>
  <picture class="profile-image w-100 h-100" v-if="props.image">
    <!-- WebP responsive -->
    <source
      :srcset="webpSrcset"
      sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw"
      type="image/webp"
    />

    <!-- JPEG fallback -->
    <img :src="originalUrl" class="w-100 h-100" :class="className" />
  </picture>
</template>

<style scoped>
img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}
</style>
