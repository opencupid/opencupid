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
const localStore = useLocalStore()

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

onMounted(() => {
  ownerProfileStore.fetchOptInSettings()
})

onMounted(async () => {
  isLoading.value = true
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
        <LoadingComponent v-if="isLoading" />
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
          v-if="!isLoading"
          class="w-100 flex-grow-1"
        >
          <BOverlay
            :show="false"
            class="h-100 d-flex flex-column justify-content-center"
          >
            <div class="mb-3 mt-2 d-flex align-items-center justify-content-between">
              <div>
                <span v-if="user.email"> {{ $t('auth.email') }}: {{ user.email }}</span>
                <span v-if="user.phonenumber">
                  {{ $t('auth.phone_number') }}: {{ user.phonenumber }}</span
                >
              </div>
              <BButton
                variant="secondary"
                size="sm"
                @click="handleClick"
              >
                <IconLogout class="svg-icon" />
                {{ $t('authentication.logout') }}</BButton
              >
            </div>

            <!-- <div class="mb-3">
      <button class="btn btn-secondary" @click="changeColor">Toggle night or day</button>
    </div> -->

            <fieldset class="mb-3">
              <legend
                for="language-selector"
                class="h5"
              >
                {{ t('settings.language_label') }}
              </legend>
              <LanguageSelectorDropdown size="md" />
            </fieldset>

            <OptInCheckboxes v-model="optInModel" />
          </BOverlay>
        </section>
        <div class="position-fixed bottom-0 w-100 p-2">
          <VersionInfo />
        </div>
      </div>
    </MiddleColumn>
  </main>
</template>
