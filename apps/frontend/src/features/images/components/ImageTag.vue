<script setup lang="ts">
import { type ImageVariant } from '@zod/profile/profileimage.dto'
import { computed, ref } from 'vue'
import type { PropType } from 'vue'
import { type VariantName } from './types'
import { refreshMediaToken } from '../composables/useMediaTokenRefresh'

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
    type: String as PropType<VariantName>,
    default: 'card',
  },
  /** optional: add loading/decoding hints */
  loading: {
    type: String as PropType<'eager' | 'lazy'>,
    default: 'eager',
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
    const v = variants.find((v) => v.size === variant)
    if (v) return v.url
  }
  console.warn('ImageTag: missing  explicit variant', variant)
}

const emit = defineEmits<{ load: [] }>()

const cacheBuster = ref('')
const hasRetried = ref(false)

const url = computed(() => {
  const base = pickUrl(props.variant, props.image.variants)
  return cacheBuster.value ? `${base}?_t=${cacheBuster.value}` : base
})

function onImgLoad() {
  hasRetried.value = false
  emit('load')
}

async function onImgError() {
  if (hasRetried.value) return
  hasRetried.value = true
  try {
    await refreshMediaToken()
    cacheBuster.value = String(Date.now())
  } catch {
    hasRetried.value = false
  }
}
</script>

<template>
  <img
    :src="url"
    :data-variant="variant"
    :class="['fitted-image', className]"
    :loading="loading"
    :decoding="decoding"
    @load="onImgLoad"
    @error="onImgError"
  />
</template>

<style scoped>
.fitted-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover; /* change to 'contain' if you want letterboxing */
  object-position: center;
}
</style>
``
