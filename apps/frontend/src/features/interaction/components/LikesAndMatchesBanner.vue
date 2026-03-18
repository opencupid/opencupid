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
      <span v-if="haveReceivedLikes">{{
        t('matches.notifications.you_have_likes', { count: receivedLikesCount })
      }}</span>
      <template v-if="haveNewMatches && haveReceivedLikes">
        &nbsp;{{ $t('matches.notifications.and') }}&nbsp;
      </template>
      <span v-if="haveNewMatches">
        {{ t('matches.notifications.matches', { count: newMatchesCount }) }}
      </span>!
    </div>
    <p class="text-muted">
      
    </p>
  </div>
</template>
