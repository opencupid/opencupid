<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInteractionsViewModel } from '../composables/useInteractionsViewModel'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import AnonymousLikeCard from './AnonymousLikeCard.vue'
import type { ReceivedLike } from '@zod/interaction/interaction.dto'

const { t } = useI18n()
const { receivedLikes, receivedLikesCount, haveReceivedLikes, refreshInteractions } =
  useInteractionsViewModel()

onMounted(() => refreshInteractions())

const emit = defineEmits<{
  (e: 'interaction:selected', like: ReceivedLike): void
}>()

const displayedLikes = computed(() => receivedLikes.value.slice(0, 4))
</script>

<template>
  <div v-if="haveReceivedLikes">
    <p class="text-center mb-2">
      {{ t('matches.notifications.you_have') }}
      {{ t('matches.notifications.likes', { count: receivedLikesCount }) }}
    </p>
    <BRow
      class="g-2 px-1"
      cols="3"
      cols-sm="4"
      cols-md="4"
      cols-lg="4"
    >
      <BCol
        v-for="like in displayedLikes"
        :key="like.createdAt"
      >
        <!-- Revealed: clickable card that emits interaction:selected -->
        <div
          v-if="like.profile"
          class="ratio ratio-1x1 clickable like-card"
          role="button"
          tabindex="0"
          @click="emit('interaction:selected', like)"
        >
          <div
            class="dating rounded-3 d-flex flex-column align-items-center justify-content-center p-2"
          >
            <ProfileThumbnail
              v-if="like.profile.profileImages[0]"
              :profile="like.profile"
              class="avatar-chip dating-eligible-highlight"
            />
            <small class="mt-1 text-truncate w-100 text-center">
              {{ like.profile.publicName }}
            </small>
          </div>
        </div>
        <!-- Anonymous: popover card with hint -->
        <AnonymousLikeCard v-else class="dating-eligible-highlight"/>
      </BCol>
    </BRow>
  </div>
</template>

<style scoped>
.avatar-chip {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
}

.clickable {
  cursor: pointer;
}

.like-card:hover {
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.15);
  border-radius: var(--bs-border-radius-lg);
}
</style>
