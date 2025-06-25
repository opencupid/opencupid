<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    howMany: number
    loading?: boolean
  }>(),
  {
    howMany: 6,
  }
)
</script>

<template>
  <div v-for="n in howMany" :key="n" class="col">
    <BPlaceholderCard
      no-footer
      no-button
      no-header
      size="sm"
      :animation="loading ? 'glow' : undefined"
    />
  </div>
</template>

<style scoped>
.card {
  /* opacity: 0.4; */
}
:deep(.card img) {
  height: 12rem;
}
</style>
