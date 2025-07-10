<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { type EditFieldProfileFormWithImages } from '@zod/profile/profile.form'

import { useWizardSteps } from '../composables/useWizardSteps'
import { useStepper } from '@vueuse/core'

import BackButton from './BackButton.vue'
import DatingSteps from './DatingSteps.vue'

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
  <div
    class="d-flex justify-content-start align-items-center w-100 flex-grow-0 position-absolute top-0 start-0"
  >
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

  <div class="mt-1 mt-md-3 d-flex flex-column justify-content-end align-items-center">
    <div class="mb-2">
      <BButton
        v-if="!isLast"
        @click="goToNext"
        :disabled="!current.state"
        variant="primary"
        class="px-5"
        pill
      >
        {{ t('onboarding.wizard.next') }}
      </BButton>
      <BButton
        v-else
        @click="$emit('finished')"
        :disabled="!current.state"
        variant="primary"
        class="px-5"
        pill
      >
        {{ t('onboarding.wizard.finish') }}
      </BButton>
    </div>
    <div>
      <BButton v-if="!isLast" @click="$emit('cancel')" variant="link" class="link-secondary">
        {{ t('onboarding.wizard.cancel') }}
      </BButton>
    </div>
  </div>
</template>
