<script setup lang="ts">
const emit = defineEmits<{
  (e: 'zoom:in'): void
  (e: 'zoom:out'): void
}>()
</script>

<template>
  <div class="map-controls map-control-group d-flex flex-column">
    <button
      type="button"
      class="map-control-btn map-control-zoom-in"
      @click="emit('zoom:in')"
    >
      +
    </button>
    <button
      type="button"
      class="map-control-btn map-control-zoom-out"
      @click="emit('zoom:out')"
    >
      −
    </button>
  </div>
</template>

<style scoped lang="scss">
.map-control-group {
  border-radius: 0.5rem;
  background: var(--bs-body-bg);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.map-control-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: var(--bs-body-bg);
  color: var(--bs-secondary-color);
  font-size: 1.5rem;
  line-height: 1;

  &:hover {
    color: var(--bs-body-color);
    background: var(--bs-tertiary-bg);
  }

  & + & {
    border-top: 1px solid var(--bs-border-color-translucent);
  }
}
</style>
