<script lang="ts" setup>
import { inject, ref, type Ref } from 'vue'
import type { OwnerProfile } from '@zod/profile/profile.dto'

import RevealedLikeCard from './RevealedLikeCard.vue'
import AnonymousLikeCard from './AnonymousLikeCard.vue'

const props = defineProps<{
  selectedAnonymous: boolean | null
}>()

const emit = defineEmits<{
  (e: 'change', isAnonymous: boolean): void
}>()

const viewerProfile = inject<Ref<OwnerProfile | null>>('viewerProfile')

const hintAnonymous = ref<boolean | null>(null)

const handleAnonymousClick = () => {
  emit('change', true)
}

const handleRevealedClick = () => {
  emit('change', false)
}
</script>

<template>
  <div>
    <h6 class="text-center">{{ $t('interactions.anonymous_toggle_question') }}</h6>
    <div class="d-flex justify-content-center gap-2">
      <div>
        <BButton
          variant="outline-dating-light"
          class="btn-anon-choice mb-1"
          @click="handleAnonymousClick"
          @mouseover="hintAnonymous = true"
          @mouseout="hintAnonymous = null"
          :pressed="props.selectedAnonymous === true"
        >
          <AnonymousLikeCard />
        </BButton>
        <div class="text-center">{{ $t('interactions.anonymous_toggle_anonymous') }}</div>
      </div>

      <div>
        <BButton
          size="lg"
          class="btn-anon-choice mb-1"
          variant="outline-dating-light"
          @click="handleRevealedClick"
          @mouseover="hintAnonymous = false"
          @mouseout="hintAnonymous = null"
          :pressed="props.selectedAnonymous === false"
        >
          <RevealedLikeCard
            v-if="viewerProfile"
            :profile="viewerProfile"
            class="w-100"
          />
        </BButton>
        <div class="text-center">{{ $t('interactions.anonymous_toggle_reveal') }}</div>
      </div>
    </div>
    <div
      class="form-hint mb-2 text-muted"
      style="height: 1rem"
    >
      <span
        class="hint"
        :class="{ 'd-block': hintAnonymous === true }"
        >{{ $t('interactions.anonymous_like_explanation') }}</span
      >
      <span
        class="hint"
        :class="{ 'd-block': hintAnonymous === false }"
        >{{ $t('interactions.revealed_like_explanation') }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.hint {
  display: none;
}
.placeholder-chip {
  width: 2.5rem;
  background-color: var(--bs-dating-light);
  opacity: 0.4;
}
.profile-thumbnail {
  width: 2.5rem !important;
  height: 2.5rem !important;
}
</style>
