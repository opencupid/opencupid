<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { type EditFieldProfileFormWithImages } from '@zod/profile/profile.form'
import { type DatingPreferencesFormType } from '@zod/match/filters.form'

import { useWizardSteps } from '../composables/useWizardSteps'
import { useStepper } from '@vueuse/core'

import BackButton from './BackButton.vue'
import DatingSteps from './DatingSteps.vue'
import { useBootstrap } from '@/lib/bootstrap'
import { onMounted } from 'vue'

const { t } = useI18n()

const emit = defineEmits<{
  // Advanced onto the recap step: everything has been filled in.
  (e: 'completed'): void
  (e: 'finished'): void
  (e: 'cancel'): void
}>()

const formData = defineModel<EditFieldProfileFormWithImages>({ required: true })

const datingPrefs = defineModel<DatingPreferencesFormType>('datingPrefs', { required: true })

const { datingWizardSteps } = useWizardSteps(formData.value, datingPrefs.value)
const { current, isFirst, isLast, goToNext, goToPrevious, isCurrent } =
  useStepper(datingWizardSteps)

const handleNext = () => {
  goToNext()
  if (isLast.value) emit('completed')
}

onMounted(async () => {
  await useBootstrap().bootstrap()
})
</script>

<template>
  <div class="flex-grow-1 d-flex flex-column justify-content-center w-100">
    <DatingSteps
      v-model="formData"
      v-model:datingPrefs="datingPrefs"
      :isCurrent
    />

    <fieldset
      v-if="isCurrent('confirm')"
      class="position-relative pt-5 px-3"
    >
      <slot />
    </fieldset>
  </div>

  <div class="mt-1 mt-md-3 d-flex flex-column justify-content-end align-items-center">
    <div class="mb-2">
      <BButton
        v-if="!isFirst && !isLast"
        @click="goToPrevious"
        variant="secondary"
        class="px-3 px-md-5 me-2"
        pill
      >
        {{ t('onboarding.wizard.previous') }}
      </BButton>
      <BButton
        v-if="!isLast"
        @click="handleNext"
        :disabled="!current.state"
        variant="primary"
        class="px-3 px-md-5"
        pill
      >
        {{ t('onboarding.wizard.next') }}
      </BButton>
      <BButton
        v-else
        @click="$emit('finished')"
        :disabled="!current.state"
        variant="primary"
        class="px-3 px-md-5"
        pill
      >
        {{ t('onboarding.wizard.finish') }}
      </BButton>
    </div>
    <!-- <div>
      <BButton
        v-if="!isLast"
        @click="$emit('cancel')"
        variant="link"
        class="link-secondary"
      >
        {{ t('onboarding.wizard.cancel') }}
      </BButton>
    </div> -->
  </div>
</template>
