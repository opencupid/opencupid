<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconHeart from '@/assets/icons/interface/heart.svg'
import { useInteractionsViewModel } from '../composables/useInteractionsViewModel'

const { t } = useI18n()
const { receivedLikesCount, haveReceivedLikes, haveMatches, matches } = useInteractionsViewModel()
</script>

<template>
  <div
    class="rounded shadow clickable d-flex align-items-center gap-1 dating p-4"
    @click="$router.push({ name: 'Messaging' })"
    v-if="haveReceivedLikes"
  >
    <div class="">
      <span class="text-dating"><IconHeart class="svg-icon" /></span>

      {{ $t('matches.notifications.you_have') }}

      {{ t('matches.notifications.likes', { count: receivedLikesCount }) }}
    </div>
  </div>
</template>
