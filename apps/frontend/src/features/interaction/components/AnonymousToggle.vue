<script lang="ts" setup>
import { inject, ref, type Ref } from 'vue'
import type { OwnerProfile } from '@zod/profile/profile.dto'
import ProfileImage from '@/features/images/components/ProfileImage.vue'

import IconAnonymousUser from '@/assets/icons/interface/user.svg'

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
          size="lg"
          class="d-flex align-items-center mb-1 p-4"
          @click="handleAnonymousClick"
          @mouseover="hintAnonymous = true"
          @mouseout="hintAnonymous = null"
          :pressed="props.selectedAnonymous === true"
        >
          <div class="placeholder-chip ratio ratio-1x1 dating-eligible-highlight">
            <div class="d-flex align-items-center justify-content-center w-100 h-100">
              <IconAnonymousUser class="svg-icon text-dating" />
            </div>
          </div>
        </BButton>
        <div class="text-center">{{ $t('interactions.anonymous_toggle_anonymous') }}</div>
      </div>

      <div>
        <BButton
          variant="outline-dating-light"
          size="lg"
          class="d-flex align-items-center mb-1 p-4"
          @click="handleRevealedClick"
          @mouseover="hintAnonymous = false"
          @mouseout="hintAnonymous = null"
          :pressed="props.selectedAnonymous === false"
        >
          <span class="profile-thumbnail d-inline-flex">
            <ProfileImage
              v-if="viewerProfile"
              :profile="viewerProfile"
              variant="thumb"
            />
          </span>
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
