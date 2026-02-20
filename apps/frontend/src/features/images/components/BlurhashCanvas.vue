<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { decode } from 'blurhash'

const props = withDefaults(
  defineProps<{
    blurhash: string
    width?: number
    height?: number
  }>(),
  { width: 32, height: 32 }
)

const canvas = ref<HTMLCanvasElement | null>(null)

function render() {
  const el = canvas.value
  if (!el || !props.blurhash) return

  const pixels = decode(props.blurhash, props.width, props.height)
  const ctx = el.getContext('2d')
  if (!ctx) return

  const imageData = ctx.createImageData(props.width, props.height)
  imageData.data.set(pixels)
  ctx.putImageData(imageData, 0, 0)
}

onMounted(render)
watch(() => props.blurhash, render)
</script>

<template>
  <canvas
    ref="canvas"
    :width="width"
    :height="height"
    class="blurhash-canvas"
  />
</template>

<style scoped>
.blurhash-canvas {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}
</style>
