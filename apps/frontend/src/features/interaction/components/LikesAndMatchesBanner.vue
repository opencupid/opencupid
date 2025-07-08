<script setup lang="ts">
import IconHeart from '@/assets/icons/interface/heart.svg'
import { useInteractionsViewModel } from '../composables/useInteractionsViewModel'

const { receivedLikesCount, haveReceivedLikes, haveNewMatches, newMatchesCount } =
  useInteractionsViewModel()
</script>

<template>
  <div
    class="rounded shadow clickable d-flex align-items-center gap-1 dating p-4"
    @click="$router.push({ name: 'Matches' })"
    v-if="haveNewMatches || haveReceivedLikes"
  >
    <div class="">
      {{ $t('matches.notifications.you_have') }}
      <span v-if="haveReceivedLikes">{{
        $t('matches.notifications.likes', { count: receivedLikesCount }, receivedLikesCount)
      }}</span>
      <span>&nbsp;</span>
      <span v-if="haveNewMatches && haveReceivedLikes">
        {{ $t('matches.notifications.and') }}
      </span>
      <span>&nbsp;</span>
      <span v-if="haveNewMatches">
        {{ $t('matches.notifications.matches', { count: newMatchesCount }, newMatchesCount) }}
      </span>
      <span>!</span>
    </div>
  </div>
</template>
