<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'

type Variant = { size: string; url: string }

const props = defineProps({
  image: {
    type: Object as PropType<{ variants: Variant[] }>,
    required: true,
  },
  className: {
    type: String,
    default: '',
  },
})

const sizesMap: Record<string, string> = {
  thumb: '150w',
  card: '480w',
  medium: '960w',
  full: '1280w',
  hd: '1920w',
}

const webpSrcset = computed(() =>
  props.image.variants
    .filter(v => sizesMap[v.size])
    .map(v => `${v.url} ${sizesMap[v.size]}`)
    .join(', ')
)

const fallbackUrl = computed(() =>
  props.image.variants.find(v => v.size === 'original')?.url || ''
)
</script>

<template>
  <picture class="profile-image">
    <source
      :srcset="webpSrcset"
      sizes="(max-width: 600px) 360px, (max-width: 1024px) 480px, 600px"
      type="image/webp"
    />
    <img :src="fallbackUrl" class="" :class="className" />
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
