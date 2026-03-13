<script setup lang="ts">
import IconMapPin from '../map-pin.svg'

defineProps<{
  isHighlighted?: boolean
}>()
</script>

<template>
  <IconMapPin
    class="svg-icon-lg poi-pin"
    :class="{ highlighted: isHighlighted }"
  />
</template>

<style lang="scss" scoped>
.poi-pin {
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.4));
}

.poi-pin.highlighted {
  filter: drop-shadow(0 0 6px rgba(217, 83, 79, 0.7));
}
</style>
