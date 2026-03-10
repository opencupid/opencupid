<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useInteractionsViewModel } from '../composables/useInteractionsViewModel'

const { t } = useI18n()
const { receivedLikesCount, haveReceivedLikes, haveNewMatches, newMatchesCount } =
  useInteractionsViewModel()

const emit = defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <div
    class="d-flex align-items-center gap-1 p-4"
    @click="emit('click')"
    v-if="haveNewMatches || haveReceivedLikes"
  >
    <div class="">
      {{ $t('matches.notifications.you_have') }}
      <span v-if="haveReceivedLikes">{{
        t('matches.notifications.likes', { count: receivedLikesCount })
        
      }}</span>
      <span>&nbsp;</span>
      <span v-if="haveNewMatches && haveReceivedLikes">
        {{ $t('matches.notifications.and') }}
      </span>
      <span>&nbsp;</span>
      <span v-if="haveNewMatches">
        {{ t('matches.notifications.matches', { count: newMatchesCount }) }}
      </span>
      <span>!</span>
    </div>
    <p class="text-muted">
      
    </p>
  </div>
</template>
