<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import type { ProfileOptInSettings } from '@zod/profile/profile.dto'

import { useAuthStore } from '@/features/auth/stores/authStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useUserStore } from '@/store/userStore'
import { usePwaInstall } from '@/features/app/composables/usePwaInstall'

import IconSetting2 from '@/assets/icons/interface/setting-2.svg'
import IconLogout from '@/assets/icons/interface/logout.svg'
import IconGlobe from '@/assets/icons/interface/globe.svg'

import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import LanguageSelectorDropdown from '../../shared/ui/LanguageSelectorDropdown.vue'
import OptInCheckboxes from '../components/OptInCheckboxes.vue'
import VersionInfo from '../components/VersionInfo.vue'
import RouterBackButton from '@/features/shared/ui/RouterBackButton.vue'
import SecondaryNav from '@/features/shared/ui/SecondaryNav.vue'
import PwaInstallButton from '@/features/app/components/PwaInstallButton.vue'

const authStore = useAuthStore()
const ownerProfileStore = useOwnerProfileStore()
const userStore = useUserStore()
const router = useRouter()

// Initialize PWA install prompt handler
usePwaInstall()

const isLoading = ref(true)
const optInModel = computed<ProfileOptInSettings>({
  get() {
    return ownerProfileStore.optInSettings
  },
  set(value) {
    ownerProfileStore.optInSettings = value
  },
})

onMounted(async () => {
  isLoading.value = true
  await Promise.all([
    ownerProfileStore.fetchOptInSettings(),
    userStore.fetchUser(),
    ownerProfileStore.fetchOwnerProfile(),
  ])
  isLoading.value = false
})

function handleClick() {
  authStore.logout()
  router.push({ name: 'Login' })
}
</script>

<template>
  <main>
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
          <template #items-right> &nbsp; </template>
        </SecondaryNav>

        <section class="w-100 flex-grow-1">
          <div class="h-100 d-flex flex-column justify-content-center">
            <fieldset class="d-flex align-items-center mb-1 mb-md-4">
              <IconGlobe class="svg-icon svg-icon-lg me-2" />
              <LanguageSelectorDropdown size="md" />
            </fieldset>
            <hr class="mb-md-4" />

            <fieldset>
              <legend class="h5 d-none d-md-block">
                {{ $t('settings.notifications_label') }}
              </legend>
              <OptInCheckboxes v-model="optInModel" />
            </fieldset>

            <fieldset>
              <PwaInstallButton />
            </fieldset>

            <hr class="mb-md-4" />

            <fieldset class="d-flex flex-wrap align-items-center gap-2">
              <div
                class="flex-grow-1 form-hint"
                style="min-width: 0; word-break: break-all"
              >
                <span v-if="userStore.user?.email">
                  <span class="d-none d-md-inline">{{ $t('auth.email') }}:</span>
                  {{ userStore.user.email }}</span
                >
                <span v-if="userStore.user?.phonenumber">
                  <span class="d-none d-md-inline">{{ $t('auth.phone_number') }}:</span>
                  {{ userStore.user.phonenumber }}</span
                >
              </div>
              <div class="flex-shrink-0">
                <BButton
                  variant="secondary"
                  size="sm"
                  @click="handleClick"
                >
                  <IconLogout class="svg-icon" />
                  {{ $t('authentication.logout') }}</BButton
                >
              </div>
            </fieldset>
          </div>
        </section>
        <div class="position-fixed bottom-0 w-100 p-2">
          <VersionInfo />
        </div>
      </div>
    </MiddleColumn>
  </main>
</template>
