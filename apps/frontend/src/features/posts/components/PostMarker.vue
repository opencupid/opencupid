<script setup lang="ts">
import type { PoiIconProps } from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'

defineOptions({ name: 'PostMarkerIcon' })
defineProps<PoiIconProps>()
</script>

<template>
  <svg
    width="32"
    height="40"
    viewBox="0 0 32 40"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Post-it body with folded corner -->
    <polygon
      points="0,0 22,0 32,10 32,32 0,32"
      fill="#fff8dc"
      stroke="#b0a080"
      stroke-width="1.5"
    />
    <!-- Folded corner triangle -->
    <polygon
      points="22,0 32,10 22,10"
      fill="#e8dfc0"
      stroke="#b0a080"
      stroke-width="1"
    />
    <!-- Text lines (decorative) -->
    <line
      x1="5"
      y1="16"
      x2="27"
      y2="16"
      stroke="#b0a080"
      stroke-width="1.5"
    />
    <line
      x1="5"
      y1="22"
      x2="27"
      y2="22"
      stroke="#b0a080"
      stroke-width="1.5"
    />
    <line
      x1="5"
      y1="28"
      x2="18"
      y2="28"
      stroke="#b0a080"
      stroke-width="1.5"
    />
    <!-- Anchor stem -->
    <polygon
      points="12,32 16,40 20,32"
      fill="#fff8dc"
      stroke="#b0a080"
      stroke-width="1.5"
    />
    <!-- Highlight ring for selected/highlighted state -->
    <circle
      v-if="isSelected || isHighlighted"
      cx="16"
      cy="16"
      r="20"
      fill="none"
      stroke="#3a86ff"
      stroke-width="2"
      stroke-dasharray="4 3"
    />
  </svg>
</template>
