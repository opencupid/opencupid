<script lang="ts" setup>
import { inject, ref, type Ref } from 'vue'
import type { OwnerProfile } from '@zod/profile/profile.dto'

import RevealedLikeCard from './RevealedLikeCard.vue'
import AnonymousProfileChip from './AnonymousProfileChip.vue'

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
    <h6 class="text-center text-secondary">{{ $t('interactions.anonymous_toggle_question') }}</h6>
    <div class="d-flex justify-content-center gap-2">
      <div class="anon-choice">
        <BButton
          variant="outline-dating-light"
          size="lg"
          class="d-flex align-items-center justify-content-center mb-1 p-2 "
          @click="handleAnonymousClick"
          @mouseover="hintAnonymous = true"
          @mouseout="hintAnonymous = null"
          :pressed="props.selectedAnonymous === true"
        >
          <AnonymousProfileChip :gender="viewerProfile?.gender ?? undefined" />
        </BButton>
        <div class="text-center">{{ $t('interactions.anonymous_toggle_anonymous') }}</div>
      </div>

      <div class="anon-choice">
        <BButton
          variant="outline-dating-light"
          size="lg"
          class="d-flex align-items-center justify-content-center mb-1 p-2 "
          @click="handleRevealedClick"
          @mouseover="hintAnonymous = false"
          @mouseout="hintAnonymous = null"
          :pressed="props.selectedAnonymous === false"
        >
          <RevealedLikeCard
            v-if="viewerProfile"
            :profile="viewerProfile"
          />
        </BButton>
        <div class="text-center">{{ $t('interactions.anonymous_toggle_reveal') }}</div>
      </div>
    </div>
    <div
      class="form-hint mb-2 text-muted px-2 mt-1"
      style="min-height: 2rem"
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
/* Two side-by-side toggle choices with equal square dimensions; the
   wrapping div fixes the BButton's box so its content (chip / card) can
   shrink-fit and center without dragging the button height with it. */
.anon-choice {
  width: 6rem;
  /* height: 6rem; */
  display: flex;
  flex-direction: column;
}

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
