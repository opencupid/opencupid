<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { ProfileOptInSettings } from '@zod/profile/profile.dto'

import { useAuthStore } from '@/features/auth/stores/authStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useUserStore } from '@/store/userStore'

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
const userStore = useUserStore()
const router = useRouter()

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

        <section class="w-100 flex-grow-1">
          <BOverlay
            :show="isLoading"
            class="h-100 d-flex flex-column justify-content-center"
          >
            <div class="row mb-3 mb-md-4 d-flex align-items-center justify-content-between">
              <div class="col-md-8">
                <span v-if="userStore.user?.email">
                  {{ $t('auth.email') }}: {{ userStore.user.email }}</span
                >
                <span v-if="userStore.user?.phonenumber">
                  {{ $t('auth.phone_number') }}: {{ userStore.user.phonenumber }}</span
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
