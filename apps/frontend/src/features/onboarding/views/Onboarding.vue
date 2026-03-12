<script setup lang="ts">
import { type LocationDTO } from '@zod/dto/location.dto'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { type GenderType, type PronounsType } from '@zod/generated'
import { type EditProfileForm } from '@zod/profile/profile.form'
import { type DatingPreferencesDTO } from '@zod/match/filters.dto'
import { DatingPreferencesFormSchema } from '@zod/match/filters.form'

import SpinnerComponent from '@/features/shared/ui/SpinnerComponent.vue'
import ErrorComponent from '@/features/shared/ui/ErrorComponent.vue'
import OnboardWizard from '@/features/onboarding/components/OnboardWizard.vue'
import OnboardingComplete from '@/features/onboarding/components/OnboardingComplete.vue'

import { useI18nStore } from '@/store/i18nStore'
import { useBootstrap } from '@/lib/bootstrap'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useMessageStore } from '../../messaging/stores/messageStore'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'

const profileStore = useOwnerProfileStore()
const i18nStore = useI18nStore()

// TODO - refactor this as per canonical Vue pattern. This initialization
// logic doesn't feel right in the view component. This should happen
// elsewhere, e.g. in ownerProfileStore
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

const datingPrefs = reactive<DatingPreferencesDTO>(DatingPreferencesFormSchema.parse({}))

const error = ref('')

const router = useRouter()

const handleGoToProfile = async () => {
  router.push({ name: 'MyProfile' })
}

const handleGoToBrowse = () => {
  router.push({ name: 'BrowseProfiles' })
}

const handleWizardFinish = async () => {
  const res = await profileStore.createOwnerProfile(formData)
  if (!res.success) {
    console.error('Failed to save profile:', res.message)
    error.value = res.message || 'Failed to save profile'
    return
  }
  await useMessageStore().fetchConversations()
}

onMounted(async () => {
  await useBootstrap().bootstrap()

  if (profileStore.profile?.isOnboarded) {
    router.push({ name: 'MyProfile' })
    return
  }

  // obtain GeoIP info
  // disabled for now - LocationSelector uses the komoot
  // API with a locality search - the search is good enough,
  // geoIP does not simplify the step.
  // appStore
  //   .fetchLocation()
  //   .then((res) => {
  //     if (res.success && res.data && !formData.location.country) {
  //       formData.location = res.data
  //     }
  //   })
  //   .catch((error) => {
  //     console.error('Failed to fetch GeoIP info:', error)
  //   })
})
</script>

<template>
  <main class="container">
    <MiddleColumn class="d-flex flex-column align-items-center justify-content-center h-100">
      <OnboardWizard
        v-model="formData"
        v-model:datingPrefs="datingPrefs"
        @finished="handleWizardFinish"
      >
        <div
          v-if="profileStore.isLoading"
          class="text-center"
        >
          <SpinnerComponent />
        </div>
        <div v-else>
          <ErrorComponent
            v-if="error"
            :error="error"
          />
          <OnboardingComplete
            v-else
            class="animate__animated animate__fadeIn"
            @browse="handleGoToBrowse"
            @profile="handleGoToProfile"
          />
        </div>
      </OnboardWizard>
    </MiddleColumn>
  </main>
</template>
