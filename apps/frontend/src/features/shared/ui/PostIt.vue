<template>
  <div class="post-it" :class="variant">
    <div class="content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  variant: {
    type: String,
    default: '',
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
.post-it.accent {
  background-color: #f9f586; /* Accent color */
}
.content {
  white-space: pre-wrap; /* Preserves whitespace and line breaks */
  overflow: hidden;
}
</style>
