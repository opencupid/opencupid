<script setup lang="ts">
import { onMounted } from 'vue'
import IconHeart from '@/assets/icons/interface/heart.svg'
import { useInteractionsViewModel } from '../composables/useInteractionsViewModel'

const { receivedLikesCount, refreshInteractions, isLoading } = useInteractionsViewModel()

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
