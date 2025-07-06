<script setup lang="ts">
import IconHeart from '@/assets/icons/interface/heart.svg'
import { useInteractionsViewModel } from '../composables/useInteractionsViewModel'
import { useI18n } from 'vue-i18n'

const { receivedLikesCount, haveReceivedLikes, haveMatches, matches } = useInteractionsViewModel()
const { tc } = useI18n()
</script>

<template>
  <div
    class="rounded shadow clickable d-flex align-items-center gap-1 dating p-4"
    @click="$router.push({ name: 'Matches' })"
    v-if="haveReceivedLikes"
  >
    <div class="">
      <span class="text-dating"><IconHeart class="svg-icon" /></span>
      <!-- You have {{ receivedLikesCount }} likes! -->
      <span>{{ tc('matches.received_likes', receivedLikesCount, { count: receivedLikesCount }) }}</span>
      <!-- <BButton
        variant="link-primary"
        class="stretched-link p-0 ms-1"
        >Check them out</BButton
      > -->
    </div>
  </div>
</template>
