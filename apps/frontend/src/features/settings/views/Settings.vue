<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

import { useColorMode } from 'bootstrap-vue-next'
import { type LoginUser } from '@zod/user/user.dto'
import type { ProfileOptInSettings } from '@zod/profile/profile.dto'

import { useMessageStore } from '@/features/messaging/stores/messageStore'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useLocalStore } from '@/store/localStore'

import IconSetting2 from '@/assets/icons/interface/setting-2.svg'
import IconLogout from '@/assets/icons/interface/logout.svg'

import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import LoadingComponent from '@/features/shared/ui/LoadingComponent.vue'
import LogoutButton from '@/features/auth/components/LogoutButton.vue'
import LanguageSelectorDropdown from '../../shared/ui/LanguageSelectorDropdown.vue'
import OptInCheckboxes from '../components/OptInCheckboxes.vue'
import VersionInfo from '../components/VersionInfo.vue'
import RouterBackButton from '@/features/shared/ui/RouterBackButton.vue'
import SecondaryNav from '@/features/shared/ui/SecondaryNav.vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const authStore = useAuthStore()
const ownerProfileStore = useOwnerProfileStore()
const router = useRouter()

const user = reactive({} as LoginUser)
const isLoading = ref(true)
const optInModel = computed<ProfileOptInSettings>({
  get() {
    // TODO defaults should not be set here. This is a band-aid to silence typing errors.
    // see also apps/frontend/src/features/onboarding/views/Onboarding.vue
    // and implement the same fix in both places when refactoring.
    return (
      ownerProfileStore.optInSettings ?? {
        isCallable: true,
        newsletterOptIn: false,
        isPushNotificationEnabled: false,
      }
    )
  },
  set(value) {
    ownerProfileStore.optInSettings = value
  },
})

onMounted(async () => {
  isLoading.value = true
  await ownerProfileStore.fetchOptInSettings()
  const [res] = await Promise.all([authStore.fetchUser(), ownerProfileStore.fetchOwnerProfile()])

  if (res.success) {
    const { user: fetched } = res
    Object.assign(user, fetched)
  } else {
    const { message } = res
    console.error('Failed to fetch user:', message)
  }
  isLoading.value = false
})

function handleClick() {
  authStore.logout()
  router.push({ name: 'Login' })
}
</script>

<template>
  <main class="w-100 position-relative overflow-hidden container-fluid">
    <MiddleColumn class="h-100 d-flex flex-column">
      <div class="d-flex flex-column justify-content-center align-items-center h-100 w-100">
        <SecondaryNav>
          <template #items-left>
            <RouterBackButton />
          </template>
          <template #items-center>
            <IconSetting2 class="svg-icon me-2" />
            {{ $t('settings.title') }}
          </template>
        </SecondaryNav>

        <section
          class="w-100 flex-grow-1"
        >
          <BOverlay
            :show="isLoading"
            class="h-100 d-flex flex-column justify-content-center"
          >
            <div class="row mb-3 mb-md-4 d-flex align-items-center justify-content-between">
              <div class="col-md-8">
                <span v-if="user.email"> {{ $t('auth.email') }}: {{ user.email }}</span>
                <span v-if="user.phonenumber">
                  {{ $t('auth.phone_number') }}: {{ user.phonenumber }}</span
                >
              </div>
              <div class="col-md-4">
                <BButton
                  variant="secondary"
                  size="sm"
                  @click="handleClick"
                >
                  <IconLogout class="svg-icon" />
                  {{ $t('authentication.logout') }}</BButton
                >
              </div>
            </div>

            <fieldset class="mb-3 mb-md-4">
              <legend class="h5">
                {{ t('settings.language_label') }}
              </legend>
              <LanguageSelectorDropdown size="md" />
            </fieldset>

            <fieldset>
              <legend class="h5">
                {{ t('settings.notifications_label') }}
              </legend>
              <OptInCheckboxes v-model="optInModel" />
            </fieldset>
          </BOverlay>
        </section>
        <div class="position-fixed bottom-0 w-100 p-2">
          <VersionInfo />
        </div>
      </div>
    </MiddleColumn>
  </main>
</template>
