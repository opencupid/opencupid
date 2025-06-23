<script setup lang="ts">
import { type LocationDTO } from '@zod/dto/location.dto'
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { type GenderType, type PronounsType } from '@zod/generated'
import { type EditProfileForm } from '@zod/profile/profile.form'

import LanguageSelector from '@/components/profiles/forms/LanguageSelector.vue'
import TagSelectComponent from '@/components/profiles/forms/TagSelectComponent.vue'
import IntrotextEditor from '@/components/profiles/forms/IntrotextEditor.vue'
import ImageEditor from '@/components/profiles/image/ImageEditor.vue'
import DatingSteps from '@/components/profiles/onboarding/DatingSteps.vue'
import SpinnerComponent from '@/components/SpinnerComponent.vue'
import ErrorComponent from '@/components/ErrorComponent.vue'
import LocationSelectorComponent from '@/components/profiles/forms/LocationSelector.vue'

import { useStepper } from '@vueuse/core'

import { useI18nStore } from '@/store/i18nStore'
import { useProfileStore } from '@/store/profileStore'
import fetchGeoIpInfo from '@/lib/geoip'

import useEditFields from '@/components/profiles/composables/useEditFields'
import { useWizardSteps } from '@/components/profiles/onboarding/useWizardSteps'
import BackButton from '@/components/profiles/onboarding/BackButton.vue'
import { useImageStore } from '@/store/imageStore'

const { t } = useI18n()
const profileStore = useProfileStore()
const i18nStore = useI18nStore()

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

    <div class="d-flex align-items-center flex-grow-1 col-12 justify-content-center">
      <BForm id="onboarding" novalidate class="w-100" @submit.prevent="handleSubmit">
        <fieldset v-if="isCurrent('publicname')" class="w-100">
          <legend>{{ t('onboarding.name_title') }}</legend>
          <PublicNameInput v-model="formData.publicName" />
        </fieldset>

        <fieldset v-else-if="isCurrent('location')">
          <legend>I'm from...</legend>
          <LocationSelectorComponent v-model="formData.location" :geoIp="true" />
        </fieldset>

        <fieldset v-else-if="isCurrent('looking_for')">
          <legend>The connections I'm looking for...</legend>
          <GoalsSelector v-model="formData" />
        </fieldset>

        <fieldset v-else-if="isCurrent('interests')">
          <legend>I'm into...</legend>
          <TagSelectComponent
            v-model="formData.tags"
            :label="t('onboarding.interests_label')"
            :placeholder="t('onboarding.interests_placeholder')"
            :required="true"
          />
        </fieldset>

        <fieldset v-else-if="isCurrent('languages')">
          <legend>I speak...</legend>
          <LanguageSelector v-model="formData.languages" :required="true" />
        </fieldset>

        <fieldset v-else-if="isCurrent('introSocial')">
          <legend>About me...</legend>
          <IntrotextEditor
            v-model="formData.introSocialLocalized"
            :languages="formData.languages"
            placeholder="Tell a bit about yourself"
          />
        </fieldset>

        <fieldset v-else-if="isCurrent('photos')">
          <legend>I look like...</legend>
          <ImageEditor />
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
// .indicators {
//   bottom: 0;
//   margin-bottom: 1rem;
//   font-size: 0.5rem;
//   position: absolute;
//   opacity: 0.2;
// }
</style>
