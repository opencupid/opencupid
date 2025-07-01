<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const viewportWidth = ref(window.innerWidth)
const viewportHeight = ref(window.innerHeight)

function updateViewportSize() {
  viewportWidth.value = window.innerWidth
  viewportHeight.value = window.innerHeight
}

onMounted(() => {
  window.addEventListener('resize', updateViewportSize)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateViewportSize)
})
</script>

<template>
  <div class="viewport-size-debug">
    <p>Viewport Width: {{ viewportWidth }}px</p>
    <p>Viewport Height: {{ viewportHeight }}px</p>
  </div>
</template>


<style scoped>
.viewport-size-debug {
  position: fixed;
  bottom: 50%;
  left: 50%;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px;
  z-index: 2000;
  font-size: 14px;
}
</style>