<template>
  <div class="help-scribble">
    <DoodleIcons name="IconArrowLeft" class="svg-icon" />
    {{ text }}
  </div>
</template>

<script setup lang="ts">
import DoodleIcons from '@/components/icons/DoodleIcons.vue'

defineProps<{
  text: string
}>()
</script>

<style scoped>
.help-scribble {
  font-family: 'Caveat', cursive;
  font-size: 2rem;
  color: var(--bs-warning);
}
</style>
