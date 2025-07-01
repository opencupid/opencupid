<script setup lang="ts">
import { onMounted } from 'vue'
import IconHeart from '@/assets/icons/interface/heart.svg'
import { useDatingInteractions } from '../composables/useDatingInteractions'

const { receivedLikesCount, refreshInteractions, isLoading } = useDatingInteractions()

onMounted(() => {
  refreshInteractions()
})
</script>

<template>
  <div class="d-flex align-items-center gap-1">
    <IconHeart class="svg-icon" />
    You have {{ receivedLikesCount }} likes
  </div>
</template>
