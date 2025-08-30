<script setup lang="ts">
import { ImageVariant } from '@zod/profile/profileimage.dto'
import { computed } from 'vue'
import type { PropType } from 'vue'
import { VariantName } from './types'


const props = defineProps({
  image: {
    type: Object as PropType<{ variants: ImageVariant[] }>,
    required: true,
  },
  /** extra classes for the <img> */
  className: {
    type: String,
    default: '',
  },
  variant: {
    type: String as PropType<VariantName >,
    default: 'card',
  },
  /** optional: add loading/decoding hints */
  loading: {
    type: String as PropType<'eager' | 'lazy'>,
    default: 'lazy',
  },
  decoding: {
    type: String as PropType<'sync' | 'async' | 'auto'>,
    default: 'async',
  },
})


const pickUrl = (variant: string, variants: ImageVariant[]) => {
  if (!variants?.length) return ''
  // explicit override first
  if (variant) {
    const v = variants.find(v => v.size === variant)
    if (v) return v.url
  }
  console.warn('ImageTag: missing  explicit variant', variant)
}

const url = computed(() => pickUrl(props.variant,  props.image.variants))
</script>

<template>
  <img
    :src="url"
    :data-variant="variant"
    :class="['fitted-image', className]"
    :loading="loading"
    :decoding="decoding"
  />
</template>

<style scoped>
.fitted-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;   /* change to 'contain' if you want letterboxing */
  object-position: center;
}
</style>
``