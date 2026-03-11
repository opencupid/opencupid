<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInteractionsViewModel } from '../composables/useInteractionsViewModel'
import AvatarIcon from '@/features/shared/components/AvatarIcon.vue'
import type { ReceivedLike } from '@zod/interaction/interaction.dto'
import type { OwnerProfile } from '@zod/profile/profile.dto'

const { t } = useI18n()
const { receivedLikes, receivedLikesCount, haveReceivedLikes } = useInteractionsViewModel()
const viewerProfile = inject<Ref<OwnerProfile | null>>('viewerProfile')
const ownerThumb = computed(() => viewerProfile?.value?.profileImages?.[0])

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
    <BRow class="g-2 px-1">
      <BCol
        v-for="(like, index) in displayedLikes"
        :key="like.createdAt"
        cols="3"
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
          </div>
        </div>
        <!-- Anonymous: entire card is the popover target -->
        <BPopover
          v-else
          placement="top"
          click
          title-class="d-none"
          body-class="popover-hint"
        >
          <template #target>
            <div class="ratio ratio-1x1 clickable like-card">
              <div
                class="dating rounded-3 d-flex flex-column align-items-center justify-content-center p-2"
              >
                <div class="placeholder-chip ratio ratio-1x1">
                  <div class="placeholder-avatar mt-2" />
                </div>
                <BPlaceholder
                  class="mt-1"
                  :width="70"
                  size="xs"
                />
              </div>
            </div>
          </template>
          <p class="mb-2">
            {{ t('matches.anonymous_like_hint') }}
          </p>
          <div class="placeholder-chip d-flex align-items-center gap-1 mb-2">
            <AvatarIcon
              v-if="ownerThumb"
              :image="ownerThumb"
              :is-highlighted="true"
              class="owner-thumb"
            />
            <span
              v-else
              class="highlighted-indicator"
            />
          </div>
          <RouterLink
            to="/browse"
            class="btn btn-sm btn-primary"
          >
            {{ t('matches.anonymous_like_hint_cta') }}
          </RouterLink>
        </BPopover>
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

.clickable {
  cursor: pointer;
}

.like-card:hover {
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.15);
  border-radius: var(--bs-border-radius-lg);
}

:deep(.popover-hint) {
  min-width: 12rem;
}

.owner-thumb {
  width: 1.5rem;
  height: 1.5rem;
}

.highlighted-indicator {
  display: inline-block;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 50%;
  background-color: var(--bs-secondary);
  box-shadow: 0 0 6px 3px rgba(217, 83, 79, 0.7);
  filter: drop-shadow(0 0 6px rgba(217, 83, 79, 0.6));
}
</style>
