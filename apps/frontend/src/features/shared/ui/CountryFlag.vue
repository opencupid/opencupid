<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  import('flag-icons/css/flag-icons.min.css')
})

defineProps<{
  code: string | undefined
  title: string | undefined
  size: string
}>()
</script>
<template>
  <div
    class="fis flag-icon"
    :class="`fi-${code?.toLowerCase()}`"
    :title="title"
    :style="{ width: size + 'px', height: size + 'px' }"
  ></div>
</template>
<style>
.flag-icon {
  width: 100%;
  height: 100%;
  background-size: contain;
  background-position: 50%;
  background-repeat: no-repeat;
  border-radius: 50%;
}
</style>
