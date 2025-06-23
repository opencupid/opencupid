<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { type EditFieldProfileFormWithImages } from '@zod/profile/profile.form'

import { useWizardSteps } from './useWizardSteps'
import { useStepper } from '@vueuse/core'

import BackButton from './BackButton.vue'
import DatingSteps from './DatingSteps.vue'
import HelpScribble from '../HelpScribble.vue'
import IconArrowRight from '@/assets/icons/arrows/arrow-right.svg'

const { t } = useI18n()

defineEmits<{
  (e: 'finished'): void
  (e: 'cancel'): void
}>()

const formData = defineModel<EditFieldProfileFormWithImages>({
  default: () => ({
    isDatingActive: false,
    isSocialActive: false,
    birthday: null,
    genderPronouns: null,
    relationshipStatus: null,
    hasKids: null,
    introSocialLocalized: {},
    introDatingLocalized: {},
  }),
})

const { datingWizardSteps } = useWizardSteps(formData.value)
const { current, isFirst, isLast, goToNext, goToPrevious, isCurrent } =
  useStepper(datingWizardSteps)
</script>

<template>
  <div class="d-flex justify-content-start align-items-center w-100 flex-grow-0">
    <BackButton :show="!isFirst && !isLast" @click="goToPrevious" />
  </div>

  <div class="flex-grow-1 d-flex flex-column justify-content-center w-100">
    <DatingSteps v-model="formData" :isCurrent />

    <fieldset v-if="isCurrent('confirm')" class="position-relative py-5 px-3">
      <legend>{{ t('onboarding.wizard.all_set') }}</legend>
      <p class="text-muted">
        {{ t('onboarding.wizard.appear_message') }}
      </p>
    </fieldset>
  </div>

  <div class="mt-3 d-flex justify-content-end align-items-center">
    <a
      v-if="!isLast"
      href="#"
      @click="$emit('cancel')"
      class="link-underline link-underline-opacity-0 me-4"
    >
      {{ 'Nevermind' }}
    </a>

    <BButton
      v-if="!isLast"
      @click="goToNext"
      :disabled="!current.state"
      variant="primary"
      size="lg"
      class="px-5"
      pill
    >
      {{ t('onboarding.wizard.next') }}
      <IconArrowRight class="svg-icon" />
    </BButton>
    <BButton
      v-else
      @click="$emit('finished')"
      :disabled="!current.state"
      variant="primary"
      size="lg"
      class="px-5"
      pill
    >
      {{ t('onboarding.wizard.finish') }}
    </BButton>
  </div>

  <!-- <div class="scribble position-absolute bottom-0 end-0 me-5 mb-2" v-if="isLast">
      <HelpScribble :text="t('onboarding.wizard.hint_click_next')" direction="se" />
    </div> -->
</template>
