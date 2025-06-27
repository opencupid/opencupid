<script setup lang="ts">
import { type LocationDTO } from '@zod/dto/location.dto'
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { type GenderType, type PronounsType } from '@zod/generated'
import { type EditProfileForm } from '@zod/profile/profile.form'

import SpinnerComponent from '@/components/SpinnerComponent.vue'
import ErrorComponent from '@/components/ErrorComponent.vue'
import OnboardWizard from '@/features/onboarding/components/OnboardWizard.vue'

import { useI18nStore } from '@/store/i18nStore'
import { useProfileStore } from '@/store/profileStore'
import { useAppStore } from '@/features/app/stores/appStore'

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
  scopes: ['social'],
} as EditProfileForm)

const error = ref('')

const router = useRouter()

const handleGoToProfile = async () => {
  router.push({ name: 'MyProfile' })
}

const handleGoToBrowse = () => {
  router.push({ name: 'BrowseProfiles' })
}

const handleWizardFinish = async () => {
  console.log('Wizard finished with data:', formData)
  const res = await profileStore.createOwnerProfile(formData)
  if (!res.success) {
    console.error('Failed to save profile:', res.message)
    error.value = res.message || 'Failed to save profile'
    return
  }
  console.log('Profile saved:', formData)
}

const appStore = useAppStore()

onMounted(async () => {
  await profileStore.fetchOwnerProfile()
  if (profileStore.profile?.isOnboarded) {
    router.push({ name: 'MyProfile' })
    return
  }

  // obtain GeoIP info
  appStore
    .fetchLocation()
    .then(res => {
      if (res.success && res.data && !formData.location.country) {
        formData.location = res.data
      }
    })
    .catch(error => {
      console.error('Failed to fetch GeoIP info:', error)
    })
})
</script>

<template>
  <main class="container pb-5 h-100 d-flex flex-column justify-content-center align-items-center">
    <OnboardWizard v-model="formData" @finished="handleWizardFinish">
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
    </OnboardWizard>
  </main>
</template>

<style lang="scss" scoped></style>
