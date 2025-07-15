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
  variant: {
    type: String,
    default: '',
  },
})

const sizesMap: Record<string, string> = {
  thumb: '150w',
  card: '400w',
  profile: '720w',
  medium: '800w',
  full: '1280w',
}

const scrSet = computed(() =>
  props.image.variants
    .filter(v => sizesMap[v.size])
    .map(v => `${v.url} ${sizesMap[v.size]}`)
    .join(', ')
)

const fallbackUrl = computed(() => props.image.variants.find(v => v.size === 'original')?.url || '')
</script>

<template>
  <picture class="profile-image">
    <!-- square crop (thumb/card) for small/mobile -->
    <source
      :srcset="scrSet"
      sizes="(max-aspect-ratio: 1/1) and (max-width: 600px) 360px, 600px"
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
