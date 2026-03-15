<script setup lang="ts">
import PostCardPlaceholder from './PostCardPlaceholder.vue'

withDefaults(
  defineProps<{
    howMany?: number
    isAnimated?: boolean
  }>(),
  {
    howMany: 6,
    isAnimated: true,
  }
)
</script>

<template>
  <BRow
    cols="1"
    cols-sm="2"
    cols-lg="3"
    class="g-2 gx-4 gy-4"
  >
    <BCol
      v-for="n in howMany"
      :key="n"
    >
      <PostCardPlaceholder :isAnimated="isAnimated" />
    </BCol>
  </BRow>
</template>
