<script setup lang="ts">
import { useI18n } from 'vue-i18n'
defineProps<{
  type: 'OFFER' | 'REQUEST'

}>()
const { t } = useI18n()
</script>

<template>
  <span class="badge post-type-badge" :class="`post-type-badge--${type.toLowerCase()}`">
    {{ t(`posts.types.${type}`) }}
  </span>
</template>

<style scoped>
.post-type-badge--offer {
  background: #d1fae5;
  color: #065f46;
}

.post-type-badge--request {
  background: #dbeafe;
  color: #1e40af;
}
</style>
