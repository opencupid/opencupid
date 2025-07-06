<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { type EditProfileForm } from '@zod/profile/profile.form'

import LanguageSelector from '@/features/shared/profileform/LanguageSelector.vue'
import TagSelectComponent from '@/features/shared/profileform/TagSelectComponent.vue'
import IntrotextEditor from '@/features/shared/profileform/IntrotextEditor.vue'
import ImageEditor from '@/features/images/components/ImageEditor.vue'
import DatingSteps from '../components/DatingSteps.vue'
import LocationSelectorComponent from '@/features/shared/profileform/LocationSelector.vue'
import GoalsSelector from './GoalsSelector.vue'
import BackButton from '../components/BackButton.vue'
import PublicNameInput from '@/features/shared/profileform/PublicNameInput.vue'
import IconSun from '@/assets/icons/interface/sun.svg'

import { useStepper } from '@vueuse/core'

import { useWizardSteps } from '@/features/onboarding/composables/useWizardSteps'

const { t } = useI18n()

const formData = defineModel<EditProfileForm>({
  default: () => ({}),
})

const emit = defineEmits<{
  (e: 'finished'): void
}>()

const { onboardingWizardSteps } = useWizardSteps(formData.value)

const { current, isLast, isFirst, goToNext, goToPrevious, goTo, isCurrent } =
  useStepper(onboardingWizardSteps)

const handleNext = () => {
  if (current.value.flags === 'stage_one_end') {
    if (!formData.value.isDatingActive) {
      goTo('confirm')
      emit('finished')
      return
    }
  }
  goToNext()

  if (isLast.value) {
    emit('finished')
  }
}

const handleSubmit = () => {
  if (current.value.state) {
    handleNext()
  }
}
</script>

<template>
  <div class="w-100 h-100 d-flex flex-column justify-content-center align-items-center">
    <div class="w-100 d-flex justify-content-between align-items-center">
      <BackButton :show="!isFirst && !isLast" @click="goToPrevious" />
    </div>

    <div class="wizard d-flex align-items-center flex-grow-1 col-12 justify-content-center">
      <BForm id="onboarding" novalidate class="w-100" @submit.prevent="handleSubmit">
        <fieldset v-if="isCurrent('publicname')" class="w-100">
          <div
            class="d-flex align-items-center justify-content-center text-success w-100 mb-4 animate__animated animate__fadeIn"
           style="height:10rem; width:10rem;">
            <IconSun class="svg-icon-100 opacity-50" />
          </div>

          <!-- onboarding intro title -->
          <legend>Welcome to Gaians.net.</legend>
          <p class="wizard-step-subtitle">
            <!-- onboarding intro text -->
            Let's walk through a few steps to set up your profile.
          </p>
          <PublicNameInput v-model="formData.publicName" />
        </fieldset>

        <fieldset v-else-if="isCurrent('location')">
          <!-- location step title -->
          <legend>I am from...</legend>
          <p class="wizard-step-subtitle">
            <!-- location step input hint -->
            Where I spend my time these days on our beautiful planet.
          </p>
          <LocationSelectorComponent v-model="formData.location" :geoIp="true" />
        </fieldset>

        <fieldset v-else-if="isCurrent('looking_for')">
          <!-- goals selector title -->
          <legend>The connections I'm looking for...</legend>
          <p class="wizard-step-subtitle">
            <!-- goals selector hint -->
            I feel complete but could use some company.
          </p>
          <GoalsSelector v-model="formData" />
        </fieldset>

        <fieldset v-else-if="isCurrent('interests')">
          <!-- interests step title -->
          <legend>I'm into...</legend>
          <p class="wizard-step-subtitle">
            <!-- interests step input hint -->
            Select your interests to help others find you.
          </p>
          <TagSelectComponent
            v-model="formData.tags"
            :label="t('onboarding.interests_label')"
            :placeholder="t('onboarding.interests_placeholder')"
            :required="true"
          />
        </fieldset>

        <fieldset v-else-if="isCurrent('languages')">
          <!-- languages step title -->
          <legend>I speak...</legend>
          <p class="wizard-step-subtitle">
            <!-- languages step input hint -->
            Select the languages you speak to help others connect with you.
          </p>
          <LanguageSelector v-model="formData.languages" :required="true" />
        </fieldset>

        <fieldset v-else-if="isCurrent('introSocial')">
          <!-- intro social step title -->
          <legend>About me...</legend>
          <p class="wizard-step-subtitle">
            <!-- intro social step input hint -->
            Write a short introduction to help others get to know you.
          </p>
          <IntrotextEditor
            v-model="formData.introSocialLocalized"
            :languages="formData.languages"
            placeholder="Tell a bit about yourself"
          />
        </fieldset>

        <fieldset v-else-if="isCurrent('photos')">
          <!-- photos step title -->
          <legend>I look like...</legend>
          <p class="wizard-step-subtitle">
            <!-- photos step input hint -->
            Upload a profile picture and any other images you want to share.
          </p>
          <div class="m-4">
            <ImageEditor />
          </div>
        </fieldset>

        <DatingSteps v-model="formData" :isCurrent></DatingSteps>

        <fieldset v-if="isCurrent('confirm')">
          <slot> </slot>
        </fieldset>

        <div class="w-100 text-center mt-4">
          <BButton
            @click="handleNext"
            :disabled="!current.state"
            v-if="!isLast"
            variant="primary"
            size="lg"
            pill
            >Next</BButton
          >
        </div>
      </BForm>
      <!-- <div v-if="!isComplete" class="d-flex justify-content-center indicators ">
        <ul class="list-unstyled text-muted">
          <li v-for="stepKey in stepNames" :key="stepKey" class="d-inline">
            <FontAwesomeIcon
              :icon="steps[stepKey].isCompleted ? 'fa-solid fa-circle' : 'fa-circle-dot'"
              class="me-2"
            />
          </li>
        </ul>
      </div> -->
    </div>
  </div>
</template>

<style lang="scss" scoped>
:deep(fieldset legend) {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  text-align: center;
  color: var(--bs-secondary);
}
:deep(.wizard) {
  font-size: 1rem;
}
// .indicators {
//   bottom: 0;
//   margin-bottom: 1rem;
//   font-size: 0.5rem;
//   position: absolute;
//   opacity: 0.2;
// }
</style>
