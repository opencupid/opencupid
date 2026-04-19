<script setup lang="ts">
import { computed } from 'vue'
import { blurhashToDataUrl } from '@/features/images/composables/useBlurhashDataUrl'

export interface AvatarImage {
  blurhash?: string | null
  variants?: { size: string; url: string }[]
}

interface Props {
  image: AvatarImage
  isHighlighted?: boolean
  hasPost?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isHighlighted: false,
  hasPost: false,
})

const thumbUrl = computed(() => props.image.variants?.find((v) => v.size === 'thumb')?.url)

const backgroundStyle = computed(() => {
  if (!props.image.blurhash) return undefined
  return { backgroundImage: `url(${blurhashToDataUrl(props.image.blurhash)})` }
})
</script>

<template>
  <div class="profile-marker">
    <img
      v-if="thumbUrl"
      :src="thumbUrl"
      :style="backgroundStyle"
      class="w-100 h-100"
      :class="{ 'poi-avatar': true, highlighted: isHighlighted }"
    />
    <div
      v-if="hasPost"
      class="post-indicator"
    />
  </div>
</template>

<style lang="scss" scoped>
.profile-marker {
  position: relative;
  width: 100%;
  height: 100%;
}

.poi-avatar {
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  background-size: cover;
}

.poi-avatar.highlighted {
  box-shadow: 0 0 6px 3px rgba(217, 83, 79, 0.7);
  filter: drop-shadow(0 0 6px rgba(217, 83, 79, 0.6));
}

.post-indicator {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 1rem;
  height: 1rem;
  background: var(--postit-bg, #fff587);
  border-radius: 3px 3px 3px 0;
  box-shadow: 1px 2px 5px rgba(0, 0, 0, 0.3);
  transform: rotate(-6deg);
  pointer-events: none;
}
</style>
