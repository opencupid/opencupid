<script setup lang="ts">
// Presentational chip rendering the placeholder-chip + placeholder line in
// a square aspect-ratio container. Used directly as the visual for an
// anonymous-like option (e.g. inside AnonymousToggle), and embedded in
// AnonymousLikeCard which wraps it with a click popover for list contexts.
</script>

<template>
  <div
    class="rounded-3 d-flex flex-column align-items-center justify-content-center gap-2 p-2 h-100"
  >
    <div class="placeholder-chip dating-eligible-highlight"></div>
    <span class="publicname-placeholder w-75"></span>
  </div>
</template>

<style scoped>
.placeholder-chip {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background-color: var(--bs-secondary);
  opacity: 0.4;
}
.publicname-placeholder {
  display: block;
  height: 0.75rem;
  background-color: var(--bs-secondary);
  opacity: 0.3;
}
</style>
