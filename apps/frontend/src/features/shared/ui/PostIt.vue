<template>
  <div class="post-it" :style="{ backgroundColor: color }">
    <slot></slot>
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
  padding: 10px;
  border: 1px solid #ccc;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
  display: inline-block; /* Allows for multiple Post-its to sit side-by-side */
  margin: 5px;
  width: 200px; /* Example width */
  min-height: 150px; /* Example minimum height */
  /* font-family: 'Caveat', cursive; */
  transform: rotate(3deg); /* Slightly tilted for a real Post-it effect */
}
</style>
