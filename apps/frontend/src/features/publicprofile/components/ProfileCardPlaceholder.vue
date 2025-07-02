<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    isAnimated?: boolean
  }>(),
  { isAnimated: false }
)

const animation = computed(() => (props.isAnimated ? 'wave' : undefined))
</script>

<template>
  <BPlaceholderCard no-footer no-button no-header size="sm" :animation="animation" />
</template>
