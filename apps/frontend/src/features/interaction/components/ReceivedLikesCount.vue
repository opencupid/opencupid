<script setup lang="ts">
import IconHeart from '@/assets/icons/interface/heart.svg'
import { useInteractionsViewModel } from '../composables/useInteractionsViewModel';

const {receivedLikesCount,haveReceivedLikes,haveMatches,matches} = useInteractionsViewModel()
</script>

<template>
  <div class="d-flex align-items-center gap-1 dating p-4" v-if="haveMatches || haveReceivedLikes">
    <span class="text-dating"><IconHeart class="svg-icon" /></span>
    You have 
    <span v-if="haveReceivedLikes">{{ receivedLikesCount }} likes</span>
    <span v-if="haveMatches && haveReceivedLikes">and</span>
    <span v-if="haveMatches">{{ matches.length }} matches</span>
    <span>!</span>
    <BButton
      variant="link"
      class="p-0 ms-1"
      @click="$router.push({ name: 'Matches' })">Check them out</BButton>
  </div>
</template>
