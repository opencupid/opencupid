<script setup lang="ts">
import { type LocationDTO } from '@zod/dto/location.dto'
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { type GenderType, type PronounsType } from '@zod/generated'
import { type EditProfileForm } from '@zod/profile/profile.form'

import SpinnerComponent from '@/features/shared/ui/SpinnerComponent.vue'
import ErrorComponent from '@/features/shared/ui/ErrorComponent.vue'
import OnboardWizard from '@/features/onboarding/components/OnboardWizard.vue'
import ViewTitle from '@/features/shared/ui/ViewTitle.vue'
import IconOkHand from '@/assets/icons/hand_gestures/ok.svg'

import { useAppStore } from '@/features/app/stores/appStore'
import { useI18nStore } from '@/store/i18nStore'
import { useBootstrap } from '@/lib/bootstrap'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useMessageStore } from '../../messaging/stores/messageStore'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'

const { t } = useI18n()
const profileStore = useOwnerProfileStore()
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
  await useMessageStore().fetchConversations()
}

const appStore = useAppStore()

onMounted(async () => {
  await useBootstrap().bootstrap()

  if (profileStore.profile?.isOnboarded) {
    router.push({ name: 'MyProfile' })
    return
  }

  // obtain GeoIP info
  appStore
    .fetchLocation()
    .then((res) => {
      if (res.success && res.data && !formData.location.country) {
        formData.location = res.data
      }
    })
    .catch((error) => {
      console.error('Failed to fetch GeoIP info:', error)
    })
})
</script>

<template>
  <main class="container">
    <MiddleColumn class="d-flex flex-column align-items-center justify-content-center h-100">
      <OnboardWizard
        v-model="formData"
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
          <div v-else class="animate__animated animate__fadeIn">
            <!-- finish screen: horizontal on lg+, vertical on smaller screens -->
            <div class="d-flex flex-column flex-lg-row align-items-center gap-4 gap-lg-5">

              <!-- Left: icon + heading -->
              <div class="d-flex flex-column align-items-center justify-content-center text-success flex-shrink-0">
                <IconOkHand style="width: 5rem; height: 5rem" class="opacity-25 mb-2" />
                <h2 class="mb-0">{{ t('onboarding.confirmation.title') }}</h2>
              </div>

              <!-- Vertical divider, visible only on lg+ -->
              <div class="d-none d-lg-block border-start" style="height: 8rem; align-self: center"></div>

              <!-- Right: CTAs -->
              <div
                v-if="!profileStore.isLoading"
                class="d-flex flex-column gap-3 flex-grow-1 w-100"
              >
                <!-- Browse CTA -->
                <div class="d-flex flex-column align-items-center align-items-lg-start gap-2">
                  <div class="text-center text-lg-start">
                    {{ t('onboarding.confirmation.browse_hint') }}
                  </div>
                  <BButton @click="handleGoToBrowse" variant="success" size="lg" pill class="w-100">
                    {{ t('onboarding.confirmation.browse_button') }}
                  </BButton>
                </div>

                <!-- Profile CTA -->
                <div class="d-flex flex-column align-items-center align-items-lg-start gap-2">
                  <div class="text-center text-lg-start">
                    {{ t('onboarding.confirmation.profile_hint') }}
                  </div>
                  <BButton @click="handleGoToProfile" variant="primary" size="lg" pill class="w-100">
                    {{ t('onboarding.confirmation.profile_button') }}
                  </BButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </OnboardWizard>
    </MiddleColumn>
  </main>
</template>
