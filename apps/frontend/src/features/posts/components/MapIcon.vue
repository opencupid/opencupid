<script setup lang="ts">
import type { PoiIconProps } from '@/features/map/types/map.types'

defineOptions({ inheritAttrs: false })

defineProps<PoiIconProps>()
</script>

<template>
  <div class="map-postit" />
</template>

<style scoped lang="scss">
.map-postit {
  width: 1.4rem;
  height: 1.4rem;
  background: var(--postit-bg, #fff587);
  border-radius: 3px 3px 3px 0;
  box-shadow: 1px 2px 5px rgba(0, 0, 0, 0.3);
  transform: rotate(-6deg);
  position: relative;

  /* tiny folded corner */
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0.4rem;
    height: 0.4rem;
    background: rgba(0, 0, 0, 0.12);
    clip-path: polygon(0 0, 100% 100%, 0 100%);
    border-radius: 0 0 0 3px;
  }
}
</style>
