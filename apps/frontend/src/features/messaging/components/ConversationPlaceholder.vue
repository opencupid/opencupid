<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  howMany?: number
  isAnimated?: boolean
}>()

const animation = computed(() => (props.isAnimated ? 'wave' : undefined))
</script>

<template>
  <div
    v-for="n in howMany"
    :key="n"
    class="ph d-flex flex-row justify-content-start align-items-center p-2 w-100 mb-2"
  >
    <div class="img" />
    <div class="d-flex flex-column flex-grow-1 ms-2">
      <BPlaceholder
        size="lg"
        :animation="animation"
        width="75"
      />
      <BPlaceholder
        size="sm"
        :animation="animation"
        width="50"
        variant="secondary"
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
.ph {
  opacity: 0.75;
}
</style>
