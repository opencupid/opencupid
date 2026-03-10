<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useInteractionsViewModel } from '../composables/useInteractionsViewModel'

const { t } = useI18n()
const { receivedLikesCount, haveReceivedLikes } = useInteractionsViewModel()
</script>

<template>
  <div v-if="haveReceivedLikes">
    <p class="text-center mb-2">
      {{ t('matches.notifications.you_have') }}
      {{ t('matches.notifications.likes', { count: receivedLikesCount }) }}
    </p>
    <BRow class="g-2 px-1">
      <BCol
        v-for="n in Math.min(receivedLikesCount, 4)"
        :key="n"
        cols="3"
      >
        <div class="ratio ratio-1x1">
          <div
            class="dating rounded-3 d-flex flex-column align-items-center justify-content-center p-2"
          >
            <div class="placeholder-chip ratio ratio-1x1">
              <div class="placeholder-avatar mt-2" />
            </div>
            <BPlaceholder
              class="mt-1"
              :width="60 + 30 * Math.random()"
              size="xs"
            />
          </div>
        </div>
      </BCol>
    </BRow>
    <p class="small text-muted lh-sm mt-2 mb-0">
      {{ t('matches.received_likes_teaser') }}
    </p>
  </div>
</template>

<style scoped>
.placeholder-chip {
  width: 2.5rem;
}

.placeholder-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: var(--bs-secondary);
  opacity: 0.4;
}
</style>
