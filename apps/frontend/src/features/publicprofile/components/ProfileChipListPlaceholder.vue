<script setup lang="ts">
import ProfileChipPlaceholder from './ProfileChipPlaceholder.vue'

const props = withDefaults(
  defineProps<{
    howMany?: number
    isAnimated?: boolean
  }>(),
  { howMany: 4 }
)
</script>

<template>
  <div
    v-for="n in howMany"
    :key="n"
    class="w-100"
  >
    <ProfileChipPlaceholder :isAnimated="isAnimated" />
  </div>
</template>

<style scoped></style>
