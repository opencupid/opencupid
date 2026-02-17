<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  isAnimated?: boolean
}>()

const animation = computed(() => (props.isAnimated ? 'wave' : undefined))
</script>

<template>
  <div
    class="d-flex align-items-center opacity-25"
    :class="animation"
    style="width: 100%; height: 3.5rem"
  >
    <div class="img" />
    <div class="ms-2 flex-grow-1">
      <BPlaceholder
        size="lg"
        :animation="animation"
        :width="65 + 50 * Math.random()"
      />
    </div>
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
</style>
