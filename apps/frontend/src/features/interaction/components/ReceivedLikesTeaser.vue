<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useInteractionsViewModel } from '../composables/useInteractionsViewModel'
import RevealedLikeCard from './RevealedLikeCard.vue'
import AnonymousLikeCard from './AnonymousLikeCard.vue'
import type { ReceivedLike } from '@zod/interaction/interaction.dto'

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
      {{ $t('matches.notifications.you_have_likes', { count: receivedLikesCount }) }}
    </p>
    <BRow
      class="g-2"
      cols="3"
      cols-sm="4"
      cols-md="4"
      cols-lg="4"
    >
      <BCol
        v-for="like in displayedLikes"
        :key="like.createdAt"
      >
        <RevealedLikeCard
          v-if="like.profile"
          :profile="like.profile"
          @click="emit('interaction:selected', like)"
        />
        <!-- Anonymous: popover card with hint -->
        <AnonymousLikeCard v-else />
      </BCol>
    </BRow>
  </div>
</template>
