<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconOkHand from '@/assets/icons/hand_gestures/ok.svg'

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'browse'): void
  (e: 'profile'): void
}>()
</script>

<template>
  <div class="d-flex flex-column flex-md-row align-items-center gap-4 gap-md-5">
    <!-- Left: icon + heading -->
    <div
      class="d-flex flex-column align-items-center justify-content-center text-success flex-shrink-0"
    >
      <IconOkHand
        style="width: 5rem; height: 5rem"
        class="svg-icon opacity-25 mb-2"
      />
      <h2 class="mb-0">{{ t('onboarding.confirmation.title') }}</h2>
    </div>

    <!-- Vertical divider, visible only on md+ -->
    <div
      class="d-none d-md-block border-start"
      style="height: 8rem; align-self: center"
    ></div>

    <!-- Right: CTAs -->
    <div class="d-flex flex-column gap-3 flex-grow-1 w-100">
      <!-- Browse CTA -->
      <div class="d-flex flex-column align-items-center align-items-md-start gap-2">
        <div class="text-center text-md-start">
          {{ t('onboarding.confirmation.browse_hint') }}
        </div>
        <BButton
          @click="emit('browse')"
          variant="success"
          size="lg"
          pill
          class="w-100"
        >
          {{ t('onboarding.confirmation.browse_button') }}
        </BButton>
      </div>

      <!-- Profile CTA -->
      <div class="d-flex flex-column align-items-center align-items-md-start gap-2">
        <div class="text-center text-md-start">
          {{ t('onboarding.confirmation.profile_hint') }}
        </div>
        <BButton
          @click="emit('profile')"
          variant="primary"
          size="lg"
          pill
          class="w-100"
        >
          {{ t('onboarding.confirmation.profile_button') }}
        </BButton>
      </div>
    </div>
  </div>
</template>
