<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInteractionsViewModel } from '../composables/useInteractionsViewModel'
import AvatarIcon from '@/features/shared/components/AvatarIcon.vue'

const { t } = useI18n()
const { receivedLikes, receivedLikesCount, haveReceivedLikes } = useInteractionsViewModel()

const displayedLikes = computed(() => receivedLikes.value.slice(0, 4))
</script>

<template>
  <div v-if="haveReceivedLikes">
    <p class="text-center mb-2">
      {{ t('matches.notifications.you_have') }}
      {{ t('matches.notifications.likes', { count: receivedLikesCount }) }}
    </p>
    <BRow class="g-2 px-1">
      <BCol
        v-for="(like, index) in displayedLikes"
        :key="index"
        cols="3"
      >
        <div class="ratio ratio-1x1">
          <div
            class="dating rounded-3 d-flex flex-column align-items-center justify-content-center p-2"
          >
            <!-- Revealed: show real avatar and name -->
            <template v-if="like.profile">
              <div class="avatar-chip ratio ratio-1x1">
                <AvatarIcon
                  v-if="like.profile.profileImages[0]"
                  :image="like.profile.profileImages[0]"
                />
                <div
                  v-else
                  class="placeholder-avatar mt-2"
                />
              </div>
              <small class="mt-1 text-truncate w-100 text-center">
                {{ like.profile.publicName }}
              </small>
            </template>
            <!-- Anonymous: show blurred placeholder -->
            <template v-else>
              <div class="placeholder-chip ratio ratio-1x1">
                <div class="placeholder-avatar mt-2" />
              </div>
              <BPlaceholder
                class="mt-1"
                :width="60 + 30 * Math.random()"
                size="xs"
              />
            </template>
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

.avatar-chip {
  width: 2.5rem;
}
</style>
