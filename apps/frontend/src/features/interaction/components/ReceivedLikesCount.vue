<script setup lang="ts">
import IconHeart from '@/assets/icons/interface/heart.svg'

import { useInteractionsViewModel } from '../composables/useInteractionsViewModel';

defineProps<{
}>()

const {receivedLikesCount,haveReceivedLikes,haveMatches,matches} = useInteractionsViewModel()

</script>

<template>
  <div class="d-flex align-items-center gap-1" v-if="haveMatches || haveReceivedLikes">
    <IconHeart class="svg-icon" />
    You have 
    <span v-if="haveReceivedLikes">{{ receivedLikesCount }} likes</span>
    <span v-if="haveMatches && haveReceivedLikes">and</span>
    <span v-if="haveMatches">{{ matches.length }} matches</span>
    <BButton
      variant="link"
      class="p-0 ms-1"
      @click="$router.push({ name: 'Matches' })">Check them out</BButton>
  </div>
</template>
