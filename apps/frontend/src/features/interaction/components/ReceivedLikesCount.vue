<script setup lang="ts">
import IconHeart from '@/assets/icons/interface/heart.svg'

defineProps<{
  receivedLikesCount: number
}>()
</script>

<template>
  <div class="d-flex align-items-center gap-1">
    <IconHeart class="svg-icon" />
    You have {{ receivedLikesCount }} likes
  </div>
</template>
