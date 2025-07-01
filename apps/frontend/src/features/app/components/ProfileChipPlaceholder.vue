<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  isAnimated?: boolean
}>()

const animation = computed(() => (props.isAnimated ? 'wave' : undefined))
</script>

<template>
  <div class="ph d-flex align-items-center gap-2 p-2 w-100 mb-2">
    <div class="img" />
    <BPlaceholder size="lg" :animation="animation" width="75" />
  </div>
</template>

<style scoped>
.img {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background-color: var(--bs-secondary);
  opacity: 0.5;
}
.ph {
  opacity: 0.75;
}
</style>
