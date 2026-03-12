<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { type EditFieldProfileFormWithImages } from '@zod/profile/profile.form'
import { type DatingPreferencesDTO } from '@zod/match/filters.dto'

import { useWizardSteps } from '../composables/useWizardSteps'
import { useStepper } from '@vueuse/core'

import IconCupid from '@/assets/images/app/cupid.svg'
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

const datingPrefs = defineModel<DatingPreferencesDTO | null>('datingPrefs', {
  default: null,
})

const { datingWizardSteps } = useWizardSteps(formData.value)
const { current, isFirst, isLast, goToNext, goToPrevious, isCurrent } =
  useStepper(datingWizardSteps)
</script>

<template>
  <div
    class="d-flex justify-content-start align-items-center w-100 flex-grow-0 position-absolute top-0 start-0"
  >
    <BackButton
      :show="!isFirst && !isLast"
      @click="goToPrevious"
    />
  </div>

  <div class="flex-grow-1 d-flex flex-column justify-content-center w-100">
    <fieldset
      v-if="isCurrent('hint')"
      class="w-100"
    >
      <div
        class="col-6 mx-auto d-flex align-items-center justify-content-center text-dating mb-2 mb-md-4 animate__animated animate__fadeIn"
      >
        <IconCupid class="svg-icon-100 opacity-50" />
      </div>
      <legend>{{ t('onboarding.dating_hint_title') }}</legend>
      <p class="text-center text-muted">
        {{ t('onboarding.dating_hint_subtitle') }}
      </p>
    </fieldset>

    <DatingSteps
      v-model="formData"
      v-model:datingPrefs="datingPrefs"
      :isCurrent
    />

    <fieldset
      v-if="isCurrent('confirm')"
      class="position-relative py-5 px-3"
    >
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
      <BButton
        v-if="!isLast"
        @click="$emit('cancel')"
        variant="link"
        class="link-secondary"
      >
        {{ t('onboarding.wizard.cancel') }}
      </BButton>
    </div>
  </div>
</template>
