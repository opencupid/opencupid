<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon: string | Component
  title?: string
}>()
</script>

<template>
  <div class="d-flex flex-column align-items-center justify-content-center">
    <div class="col-6 col-sm-2 mx-auto my-3">
      <component
        :is="icon"
        class="svg-icon-lg h-100 w-100 opacity-25"
      />
    </div>
    <h1 class="mb-3 text-muted">
      <slot>{{ title }}</slot>
    </h1>
  </div>
</template>
