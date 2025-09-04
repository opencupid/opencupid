<template>
  <div class="post-it" :style="{ backgroundColor: color }">
    <div class="content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  color: {
    type: String,
    default: '#FFFFCC',
  },
})
</script>

<style scoped>
.post-it {
  background-color: #ffffcc; /* Default yellow */
  /* padding: 0.5rem; */
  border: 1px solid #ccc;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2);
  /* display: inline-block; */
  /* margin: 0.25rem; */
  width: 100%; /* Example width */
  min-height: 150px; /* Example minimum height */
  /* transform: rotate(3deg);  */
}
.content {
  white-space: pre-wrap; /* Preserves whitespace and line breaks */
  max-height: 5rem;
  overflow: hidden;
}
</style>
