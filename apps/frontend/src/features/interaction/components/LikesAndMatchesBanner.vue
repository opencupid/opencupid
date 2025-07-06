<script setup lang="ts">
import IconHeart from '@/assets/icons/interface/heart.svg'
import { useInteractionsViewModel } from '../composables/useInteractionsViewModel'
import { useI18n } from 'vue-i18n'

const { receivedLikesCount, haveReceivedLikes, haveNewMatches, newMatchesCount } = useInteractionsViewModel()
const { tc, t } = useI18n()
</script>

<template>
  <div
    class="rounded shadow clickable d-flex align-items-center gap-1 dating p-4"
        @click="$router.push({ name: 'Matches' })"

    v-if="haveNewMatches || haveReceivedLikes"
  >
    <div class="">
      <span class="text-dating"><IconHeart class="svg-icon" /></span>
      <!-- You have X likes and X new matches! -->
      <span>
        {{
          [
            haveReceivedLikes
              ? tc('matches.received_likes', receivedLikesCount, { count: receivedLikesCount })
              : null,
            haveNewMatches
              ? t('matches.new_matches', { count: newMatchesCount })
              : null,
          ]
            .filter(Boolean)
            .join(' ')
        }}
      </span>
      <!-- <BButton
        variant="link-primary"
        class="stretched-link p-0 ms-1"
        >Check them out</BButton
      > -->
    </div>
  </div>
</template>
