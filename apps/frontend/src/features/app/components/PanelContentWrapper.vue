<script setup lang="ts">
import { provide } from 'vue'

defineOptions({ name: 'PanelContentWrapper' })

const props = defineProps<{ close: () => void }>()

// Expose `close` to descendants. Content components render their own close
// affordance (matching "content owns the entire container") and call this
// via `inject<() => void>('detailPanelClose')()`.
provide('detailPanelClose', props.close)
</script>

<template>
  <div class="h-100 position-relative">
    <div
      class="position-absolute w-100 d-flex justify-content-end p-2 top-0"
      style="z-index: 10"
    >
      <button
        type="button"
        class="btn-close"
        :aria-label="$t('common.close')"
        @click="close()"
      />
    </div>
    <slot />
  </div>
</template>
