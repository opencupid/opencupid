<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from 'vue'

import ImageTag from './ImageTag.vue'
import { type ImageVariant } from '@zod/image/image.dto'
import { type VariantName } from './types'
import { blurhashToDataUrl } from '../composables/useBlurhashDataUrl'

/**
 * An image that stays transparent until it has loaded, with its blurhash
 * showing on the wrapper behind it; it then fades in. An image already in the
 * browser cache (complete on mount) is shown at once, without the fade.
 * The wrapper fills its container; style the <img> through `imgClass`.
 */
const props = defineProps<{
  image: { variants: ImageVariant[]; blurhash?: string | null }
  variant?: VariantName
  imgClass?: string
}>()

const emit = defineEmits<{ load: [] }>()

const imgTag = ref<ComponentPublicInstance | null>(null)
const loaded = ref(false)
const instant = ref(false)

const syncWithCache = () => {
  const el = imgTag.value?.$el as HTMLImageElement | undefined
  instant.value = !!el?.complete && el.naturalWidth > 0
  loaded.value = instant.value
}

// Reset whenever the <img> source can change: a new image, another variant,
// or a variant URL updated in place. Watching the inputs rather than the
// resolved URL keeps ImageTag the only place that picks the variant.
watch(
  () => [props.image, props.variant, props.image.variants.map((v) => v.url).join('|')],
  () => nextTick(syncWithCache),
  { immediate: true }
)

const handleLoad = () => {
  loaded.value = true
  emit('load')
}

// Kept after load so the fade-in blends from the blurhash.
const wrapperStyle = computed(() =>
  props.image.blurhash
    ? { backgroundImage: `url(${blurhashToDataUrl(props.image.blurhash)})` }
    : undefined
)
</script>

<template>
  <div
    class="blurhash-image"
    :style="wrapperStyle"
  >
    <ImageTag
      ref="imgTag"
      :image="image"
      :className="imgClass"
      :class="['blurhash-image-photo', { loaded, instant }]"
      :variant="variant"
      @load="handleLoad"
    />
  </div>
</template>

<style scoped>
.blurhash-image {
  display: block;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
}
.blurhash-image-photo {
  opacity: 0;
  transition: opacity 0.3s ease-in;
}
.blurhash-image-photo.loaded {
  opacity: 1;
}
.blurhash-image-photo.instant {
  transition: none;
}
</style>
