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

const siteName = __APP_CONFIG__.SITE_NAME || 'OpenCupid'
</script>

<template>
  <div class="w-100 h-100 d-flex flex-column justify-content-center align-items-center">
    <div
      class="w-100 d-flex justify-content-between align-items-center position-absolute top-0 left-0"
    >
      <BackButton :show="!isFirst && !isLast" @click="goToPrevious" />
    </div>

    <div class="wizard d-flex align-items-center flex-grow-1 col-12 justify-content-center">
      <BForm id="onboarding" novalidate class="w-100" @submit.prevent="handleSubmit">
        <fieldset v-if="isCurrent('publicname')" class="w-100">
          <div
            class="d-flex align-items-center justify-content-center text-success w-100 mb-4 animate__animated animate__fadeIn"
            style="height: 10rem; width: 10rem"
          >
            <IconSun class="svg-icon-100 opacity-50" />
          </div>

          <legend>
            <!-- Welcome to {siteName}. -->
            {{ t('onboarding.welcome_title', { siteName: siteName }) }}
          </legend>
          <p class="wizard-step-subtitle">
            <!-- Let's walk through a few steps to set up your profile. -->
            {{ t('onboarding.welcome_subtitle') }}
          </p>
          <PublicNameInput v-model="formData.publicName" />
        </fieldset>

        <fieldset v-else-if="isCurrent('location')">
          <legend>
            <!-- I am from... -->
            {{ t('onboarding.location_title') }}
          </legend>
          <LocationSelectorComponent v-model="formData.location" :geoIp="true" />
        </fieldset>

        <fieldset v-else-if="isCurrent('looking_for')">
          <!-- goals selector title -->
          <legend>
            <!-- The connections I'm looking for... -->
            {{ t('onboarding.connections_title') }}
          </legend>
          <GoalsSelector v-model="formData" />
        </fieldset>

        <fieldset v-else-if="isCurrent('interests')">
          <legend>
            <!-- I'm into... -->
            {{ t('onboarding.interests_title') }}
          </legend>
          <p class="wizard-step-subtitle">
            <!-- Select your interests to help others find you. -->
            {{ t('onboarding.interests_subtitle') }}
          </p>
          <TagSelectComponent
            v-model="formData.tags"
            :label="t('onboarding.interests_label')"
            :placeholder="t('onboarding.interests_placeholder')"
            :required="true"
          />
          <div class="form-text text-muted">
            <!-- Start typing to search for tags. You can add new tags if you don't find what you're looking for. -->
            {{ t('onboarding.interests_hint') }}
          </div>
        </fieldset>

        <fieldset v-else-if="isCurrent('languages')">
          <legend>
            <!-- I speak... -->
            {{ t('onboarding.languages_title') }}
          </legend>
          <p class="wizard-step-subtitle">
            <!-- Select the languages you speak to help others connect with you. -->
            {{ t('onboarding.languages_subtitle') }}
          </p>
          <LanguageSelector v-model="formData.languages" :required="true" />
        </fieldset>

        <fieldset v-else-if="isCurrent('introSocial')">
          <legend>
            <!-- About me... -->
            {{ t('onboarding.social_intro_title') }}
          </legend>
          <p class="wizard-step-subtitle">
            <!-- Write a short introduction to help others get to know you. -->
            {{ t('onboarding.social_intro_subtitle') }}
          </p>
          <IntrotextEditor
            v-model="formData.introSocialLocalized"
            :languages="formData.languages"
            :placeholder="t('onboarding.social_intro_placeholder')"
          />
          <div class="form-text text-muted">
            <!-- This is optional, you can fill it out later. -->
            {{ t('onboarding.social_intro_hint') }}
          </div>
        </fieldset>

        <fieldset v-else-if="isCurrent('photos')">
          <legend>
            <!-- I look like... -->
            {{ t('onboarding.photos_title') }}
          </legend>
          <ImageEditor />
        </fieldset>

        <DatingSteps v-model="formData" :isCurrent></DatingSteps>

        <fieldset v-if="isCurrent('confirm')">
          <slot> </slot>
        </fieldset>

        <div class="w-100 text-center mt-2 mt-md-4">
          <BButton
            @click="handleNext"
            :disabled="!current.state"
            v-if="!isLast"
            variant="primary"
            size="lg"
            class="px-md-5"
            pill
          >
            <!-- Next -->
            {{ t('onboarding.wizard.next') }}
          </BButton>
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
p.wizard-step-subtitle {
  margin-bottom: 0.5rem;
  text-align: center;
}
// .indicators {
//   bottom: 0;
//   margin-bottom: 1rem;
//   font-size: 0.5rem;
//   position: absolute;
//   opacity: 0.2;
// }
</style>
