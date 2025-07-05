<script setup lang="ts">
import IconHeart from '@/assets/icons/interface/heart.svg'
import { useInteractionsViewModel } from '../composables/useInteractionsViewModel'

const { receivedLikesCount, haveReceivedLikes, haveMatches, matches } = useInteractionsViewModel()
</script>

<template>
  <div
    class="rounded shadow clickable d-flex align-items-center gap-1 dating p-4"
    @click="$router.push({ name: 'Matches' })"
    v-if="haveReceivedLikes"
  >
    <div class="">
      <span class="text-dating"><IconHeart class="svg-icon" /></span>
      You have
      {{ receivedLikesCount }} likes!
      <!-- <BButton
        variant="link-primary"
        class="stretched-link p-0 ms-1"
        >Check them out</BButton
      > -->
    </div>
  </div>
</template>
