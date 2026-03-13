<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { type CreateProfileForm, CreateProfileFormSchema } from '@zod/profile/profile.form'
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

const profileForm = reactive<CreateProfileForm>({
  ...CreateProfileFormSchema.parse({}),
  languages: [i18nStore.getLanguage()],
})

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
  Object.assign(profileForm, datingPrefs)
  const res = await profileStore.createOwnerProfile(profileForm)
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
        v-model="profileForm"
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
