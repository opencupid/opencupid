<script setup lang="ts">
import IconMapPin from '../map-pin.svg'
import type { PoiIconProps } from '@/features/shared/components/OsmPoiMap.types'

defineOptions({ inheritAttrs: false })

const props = defineProps<PoiIconProps>()
</script>

<template>
  <IconMapPin class="svg-icon-lg poi-pin" />
</template>

<style lang="scss" scoped>
.poi-pin {
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.4));
}

</style>
