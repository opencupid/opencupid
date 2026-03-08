<script setup lang="ts">
export interface AvatarImage {
  variants?: { size: string; url: string }[]
}

interface Props {
  image: AvatarImage
  isHighlighted?: boolean
}

withDefaults(defineProps<Props>(), {
  isHighlighted: false,
})

const thumbUrl = (image: AvatarImage) => image.variants?.find((v) => v.size === 'thumb')?.url
</script>

<template>
  <img
    v-if="thumbUrl(image)"
    :src="thumbUrl(image)"
    class="w-100 h-100"
    :class="{ 'poi-avatar': true, highlighted: isHighlighted }"
  />
</template>

<style lang="scss" scoped>
.poi-avatar {
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  background: #e0e0e0;
}

.poi-avatar.highlighted {
  box-shadow: 0 0 6px 3px rgba(217, 83, 79, 0.7);
  filter: drop-shadow(0 0 6px rgba(217, 83, 79, 0.6));
}
</style>
