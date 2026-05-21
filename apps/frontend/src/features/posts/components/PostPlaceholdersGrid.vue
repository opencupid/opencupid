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
    cols-lg="1"
    class="g-4"
  >
    <BCol
      v-for="n in howMany"
      :key="n"
    >
      <PostCardPlaceholder
        :index="n"
        :isAnimated="isAnimated"
      />
    </BCol>
  </BRow>
</template>
