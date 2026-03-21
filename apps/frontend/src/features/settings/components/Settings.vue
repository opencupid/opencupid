<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { ProfileOptInSettings } from '@zod/profile/profile.dto'

import { useAuthStore } from '@/features/auth/stores/authStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useUserStore } from '@/store/userStore'
import { usePwaInstall } from '@/features/app/composables/usePwaInstall'

import IconLogout from '@/assets/icons/interface/logout.svg'
import IconGlobe from '@/assets/icons/interface/globe.svg'

const emit = defineEmits<{
  (e: 'close'): void
}>()

import LanguageSelectorDropdown from '@/features/shared/ui/LanguageSelectorDropdown.vue'
import OptInCheckboxes from './OptInCheckboxes.vue'
import VersionInfo from './VersionInfo.vue'
import PwaInstallButton from '@/features/app/components/PwaInstallButton.vue'
import CloseAccountDialog from './CloseAccountDialog.vue'

const authStore = useAuthStore()
const ownerProfileStore = useOwnerProfileStore()
const userStore = useUserStore()

usePwaInstall()

const isLoading = ref(true)
const showCloseAccountDialog = ref(false)
const isClosingAccount = ref(false)

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

function handleLogout() {
  authStore.logout()
}

async function handleCloseAccount() {
  isClosingAccount.value = true
  const result = await userStore.deleteAccount()
  isClosingAccount.value = false
  showCloseAccountDialog.value = false
  if (result.success) {
    authStore.logout()
  }
}
</script>

<template>
  <div class="px-3 p-md-5 h-100 w-100 d-flex flex-column justify-content-center">
    <fieldset class="d-flex align-items-center mb-3 mb-lg-5">
      <IconGlobe class="svg-icon svg-icon-lg me-2" />
      <LanguageSelectorDropdown size="md" />
    </fieldset>

    <div class="mb-md-3">
      <h6>{{ $t('settings.notifications_label') }}</h6>
      <OptInCheckboxes v-model="optInModel" />
    </div>
    <fieldset class="mb-md-3">
      <PwaInstallButton />
    </fieldset>
    <fieldset class="d-flex flex-wrap align-items-center gap-2">
      <div
        class="flex-grow-1 form-hint small lh-sm"
        style="min-width: 0; word-break: break-all"
      >
        <template v-if="userStore.user">
          <span>{{ userStore.user.email }}</span>
          <span v-if="userStore.user.phonenumber">{{ userStore.user.phonenumber }}</span>
        </template>
      </div>
      <BButton
        variant="secondary"
        size="sm"
        @click="handleLogout"
      >
        <IconLogout class="svg-icon" />
        {{ $t('authentication.logout') }}
      </BButton>
    </fieldset>

    <hr class="mb-md-4" />

    <fieldset>
      <BButton
        variant="outline-danger"
        size="sm"
        @click="showCloseAccountDialog = true"
      >
        {{ $t('settings.close_account_button') }}
      </BButton>
    </fieldset>

    <div class="mt-auto pt-3 position-absolute bottom-0 start-0 w-100 pb-2">
      <VersionInfo />
    </div>

    <CloseAccountDialog
      v-model="showCloseAccountDialog"
      :user-identifier="userStore.user?.email ?? userStore.user?.phonenumber ?? null"
      :loading="isClosingAccount"
      @confirm="handleCloseAccount"
    />
  </div>
</template>
