<script setup lang="ts">
defineOptions({ name: 'DetailContainer' })

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <aside
    v-if="open"
    class="detail-container d-flex flex-column border-end bg-white"
  >
    <div class="panel-header px-3 py-2 border-bottom d-flex align-items-center">
      <h6 class="mb-0 flex-grow-1">
        <slot name="header" />
      </h6>
      <button
        type="button"
        class="btn-close"
        @click="emit('close')"
      />
    </div>
    <div class="panel-body flex-grow-1 overflow-auto p-0">
      <slot />
    </div>
  </aside>
</template>

<style scoped lang="scss">
.detail-container {
  width: 280px;
  min-width: 280px;
  height: 100%;

  @media (max-width: 575.98px) {
    position: absolute;
    inset: 0;
    width: 100vw;
    z-index: 1020;
  }
}
</style>
