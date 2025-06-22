<script setup lang="ts">
import LocationSelectorComponent from '@/components/profiles/forms/LocationSelector.vue'
import { useStepper } from '@vueuse/core'
import { type LocationDTO } from '@zod/dto/location.dto'
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { type GenderType, type PronounsType } from '@zod/generated'

import LanguageSelector from '@/components/profiles/forms/LanguageSelector.vue'
import GoalsSelector from '../components/profiles/onboarding/GoalsSelector.vue'
import TagSelectComponent from '@/components/profiles/forms/TagSelectComponent.vue'
import IntrotextEditor from '@/components/profiles/forms/IntrotextEditor.vue'
import ImageEditor from '@/components/profiles/image/ImageEditor.vue'
import PublicNameInput from '../components/profiles/forms/PublicNameInput.vue'
import DatingSteps from '@/components/profiles/onboarding/DatingSteps.vue'

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import SpinnerComponent from '@/components/SpinnerComponent.vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '@/store/profileStore'
import useEditFields from '@/components/profiles/composables/useEditFields'
import { type EditProfileForm } from '@zod/profile/profile.form'
import ErrorComponent from '@/components/ErrorComponent.vue'
import { useOnboardingWizard } from '@/components/profiles/onboarding/useProfileWizards'
import { useI18nStore } from '@/store/i18nStore'
import fetchGeoIpInfo from '@/lib/geoip'

const { t } = useI18n()
const profileStore = useProfileStore()
const i18nStore = useI18nStore()

const formData = reactive({
  publicName: '',
  birthday: null,
  tags: [],
  languages: [i18nStore.getLanguage()],
  location: {
    country: '',
    cityId: '',
    cityName: '',
  } as LocationDTO,
  gender: 'unspecified' as GenderType,
  pronouns: 'unspecified' as PronounsType,
  relationship: null,
  hasKids: null,
  introSocial: '',
  introDating: '',
  introSocialLocalized: {} as Record<string, string>,
  introDatingLocalized: {} as Record<string, string>,
  isDatingActive: false,
  isSocialActive: true,
} as EditProfileForm)

const {
  publicNameModel,
  birthdayModel,
  relationshipModel,
  hasKidsModel,
  introSocialModel,
  introDatingModel,
  genderPronounsModel,
} = useEditFields(formData)

const { onboardingWizard } = useOnboardingWizard(formData)

const { current, isFirst, goToNext, goToPrevious, goTo, isCurrent, next, index, previous, steps } =
  useStepper(onboardingWizard)

const isComplete = ref(false)
const error = ref('')

const saveProfile = async () => {
  const res = await profileStore.updateOwnerProfile(formData)
  if (!res.success) {
    console.error('Failed to save profile:', res.message)
    error.value = res.message || 'Failed to save profile'
    return
  }
  console.log('Profile saved:', formData)
}

const handleNext = async () => {
  if (current.value) {
    current.value.isCompleted = true
    if (current.value.flags === 'stage_one_end') {
      if (formData.isDatingActive) {
        goToNext()
      } else {
        isComplete.value = true
        goTo('confirm')
        await saveProfile()
      }
    } else if (current.value.flags === 'stage_two_end') {
      isComplete.value = true
      goTo('confirm')
      await saveProfile()
      console.log('Stage completed:', current.value.state)
    } else if (current.value.state) {
      goToNext()
    } else {
      console.warn('Current step is not valid')
    }
  } else {
    console.warn('No current step found')
  }
}

const router = useRouter()
const handleGoToProfile = async () => {
  router.push({ name: 'MyProfile' })
}

const handleGoToBrowse = () => {
  router.push({ name: 'BrowseProfiles' })
}

const handlePrevious = () => {
  current.value.isCompleted = false
  goToPrevious()
}

const handleSubmit = () => {
  if (current.value.state) {
    handleNext()
  }
}

onMounted(async () => {
  await profileStore.fetchOwnerProfile()
  if (profileStore.profile?.isOnboarded) {
    router.push({ name: 'MyProfile' })
  }

  if (formData.location.country) return
  fetchGeoIpInfo()
    .then(countryCode => {
      if (countryCode) {
        formData.location.country = countryCode
      }
    })
    .catch(error => {
      console.error('Failed to fetch GeoIP info:', error)
    })
})
</script>

<template>
  <main class="container pb-5 h-100 d-flex flex-column justify-content-center align-items-center">
    <!-- {{ formData }} -->
    <div class="w-100 d-flex justify-content-between align-items-center">
      <BButton
        @click="handlePrevious"
        v-if="!isFirst && !isComplete"
        href="#"
        variant="link-secondary"
        class="d-flex align-items-center mt-2"
        size="lg"
      >
        <FontAwesomeIcon icon="fa-solid fa-chevron-left" class="" />
      </BButton>
    </div>

    <div class="d-flex align-items-center flex-grow-1 col-12 justify-content-center">
      <BForm id="onboarding" novalidate class="w-100" @submit.prevent="handleSubmit">
        <fieldset v-if="isCurrent('publicname')" class="w-100">
          <legend>{{ t('onboarding.name_title') }}</legend>
          <PublicNameInput v-model="publicNameModel" />
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
            v-model="introSocialModel"
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
          <div v-if="profileStore.isLoading" class="text-center">
            <SpinnerComponent />
          </div>
          <div v-else>
            <ErrorComponent v-if="error" :error="error" />
            <div v-else>
              <legend>Done!</legend>
              <div v-if="!profileStore.isLoading" class="d-flex flex-column gap-3">
                <BButton
                  @click="handleGoToProfile"
                  variant="success"
                  size="lg"
                  pill
                  class="d-flex align-items-center justify-content-center"
                  >Go to my profile</BButton
                >
                <BButton
                  @click="handleGoToBrowse"
                  variant="success"
                  size="lg"
                  pill
                  class="d-flex align-items-center justify-content-center"
                  >Go find people</BButton
                >
              </div>
            </div>
          </div>
        </fieldset>
        <div class="w-100 text-center mt-4">
          <BButton
            @click="handleNext"
            :disabled="!current.state"
            v-if="!isComplete"
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

    <!-- <pre>{{ formData }}</pre> -->
  </main>
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
