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
    <slot />
  </div>
</template>
