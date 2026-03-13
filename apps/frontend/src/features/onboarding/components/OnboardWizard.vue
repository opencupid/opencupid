<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { type EditProfileForm } from '@zod/profile/profile.form'
import { type DatingPreferencesDTO } from '@zod/match/filters.dto'

import LanguageSelector from '@/features/shared/profileform/LanguageSelector.vue'
import TagExplorer from '@/features/shared/components/TagExplorer.vue'
import IntrotextEditor from '@/features/shared/profileform/IntrotextEditor.vue'
import ImageEditor from '@/features/images/components/ImageEditor.vue'
import DatingSteps from '../components/DatingSteps.vue'
import LocationSelectorComponent from '@/features/shared/profileform/LocationSelector.vue'
import BackButton from '../components/BackButton.vue'
import PublicNameInput from '@/features/shared/profileform/PublicNameInput.vue'
import LogoutButton from '@/features/auth/components/LogoutButton.vue'

import IconSun from '@/assets/icons/interface/sun.svg'
import IconLogout from '@/assets/icons/interface/logout.svg'
import IconCupid from '@/assets/images/app/cupid.svg'

import { useStepper } from '@vueuse/core'

import { useWizardSteps } from '@/features/onboarding/composables/useWizardSteps'
import { useTagsStore } from '@/store/tagStore'

const { t } = useI18n()

const formData = defineModel<EditProfileForm>({
  default: () => ({}),
})

const datingPrefs = defineModel<DatingPreferencesDTO>('datingPrefs')

const emit = defineEmits<{
  (e: 'finished'): void
}>()

const { onboardingWizardSteps } = useWizardSteps(formData.value, datingPrefs.value)

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

const tagStore = useTagsStore()

const handleLocationSelected = async (location: { country: string }) => {
  await tagStore.fetchPopularTags({
    country: location.country,
    limit: 50,
  })
}

const siteName = __APP_CONFIG__.SITE_NAME
</script>

<template>
  <div class="w-100 h-100 d-flex flex-column justify-content-center align-items-center">
    <div
      class="w-100 d-flex justify-content-between align-items-center position-absolute top-0 left-0"
    >
      <BackButton
        :show="!isFirst && !isLast"
        @click="goToPrevious"
      />

      <LogoutButton
        v-if="isFirst"
        variant="link"
        class="btn btn-link link-secondary text-decoration-non"
      >
        <IconLogout class="svg-icon" />
      </LogoutButton>
    </div>

    <div class="wizard d-flex align-items-center flex-grow-1 col-12 justify-content-center">
      <BForm
        id="onboarding"
        novalidate
        class="w-100"
        @submit.prevent="handleSubmit"
      >
        <fieldset
          v-if="isCurrent('publicname')"
          class="w-100"
        >
          <div
            class="col-6 mx-auto d-flex align-items-center justify-content-center text-success mb-2 mb-md-4 animate__animated animate__fadeIn"
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
          <LocationSelectorComponent
            v-model="formData.location"
            open-direction="top"
            :allow-empty="false"
            :close-on-select="true"
            :geoIp="true"
            @selected="handleLocationSelected"
          />
          <p class="form-text text-muted mt-2">
            <!-- Start typing.... -->
            {{ t('onboarding.location_hint') }}
          </p>
        </fieldset>

        <fieldset v-else-if="isCurrent('interests')">
          <legend>
            <!-- I'm into... -->
            {{ t('onboarding.interests_title') }}
          </legend>
          <div class="form-text text-muted lh-sm mb-2">
            <!-- Start typing to search for tags. You can add new tags if you don't find what you're looking for. -->
            <small>{{ t('onboarding.interests_hint') }}</small>
          </div>
          <TagExplorer
            v-model="formData.tags"
            :location="formData.location"
          />
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
          <LanguageSelector
            v-model="formData.languages"
            :required="true"
          />
        </fieldset>

        <fieldset v-else-if="isCurrent('introSocial')">
          <legend>
            <!-- About me... -->
            <!-- {{ t('onboarding.social_intro_title') }} -->
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

        <fieldset v-else-if="isCurrent('dating_mode')">
          <div
            class="col-6 mx-auto d-flex align-items-center justify-content-center text-dating mb-2 mb-md-4 animate__animated animate__fadeIn"
          >
            <IconCupid class="svg-icon-100 opacity-50" />
          </div>
          <!-- <legend>
            {{ t('onboarding.dating_mode_step_title') }}
          </legend> -->
          <div class="mb-3 d-flex flex-column align-items-center">
            <BFormCheckbox
              v-model="formData.isDatingActive"
              switch
              size="lg"
            >
              {{ t('onboarding.dating_mode_switch') }}
            </BFormCheckbox>

            <p class="text-muted text-center">
              <span v-if="formData.isDatingActive">
                {{ t('onboarding.dating_mode_step_hint_active') }}
              </span>
              <span v-else>
                {{ t('onboarding.dating_mode_step_hint_inactive') }}
              </span>
            </p>
          </div>
        </fieldset>

        <DatingSteps
          v-model="formData"
          v-model:datingPrefs="datingPrefs"
          :isCurrent
        ></DatingSteps>

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
:deep(.interests-multiselect .multiselect__tags) {
  min-height: 5rem;
  align-items: start;
}
</style>
