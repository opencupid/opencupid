<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { ProfileOptInSettings } from '@zod/profile/profile.dto'

import { useAuthStore } from '@/features/auth/stores/authStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useUserStore } from '@/store/userStore'
import { usePwaInstall } from '@/features/app/composables/usePwaInstall'

import IconLogout from '@/assets/icons/interface/logout.svg'

const emit = defineEmits<{
  (e: 'close'): void
}>()

import LanguageSelectorDropdown from '@/features/shared/ui/LanguageSelectorDropdown.vue'
import OptInCheckboxes from './OptInCheckboxes.vue'
import VersionInfo from './VersionInfo.vue'
import PwaInstallButton from '@/features/app/components/PwaInstallButton.vue'

const authStore = useAuthStore()
const ownerProfileStore = useOwnerProfileStore()
const userStore = useUserStore()

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

function handleLogout() {
  authStore.logout()
  emit('close')
}
</script>

<template>
  <div class="px-3 py-3">
      <fieldset class="d-flex align-items-center mb-3">
        <LanguageSelectorDropdown size="md" />
      </fieldset>
      <hr />
      <fieldset class="mb-3">
        <legend class="h6">{{ $t('settings.notifications_label') }}</legend>
        <OptInCheckboxes v-model="optInModel" />
      </fieldset>
      <fieldset class="mb-3">
        <PwaInstallButton />
      </fieldset>
      <hr />
      <fieldset class="d-flex flex-wrap align-items-center gap-2">
        <div
          class="flex-grow-1 form-hint"
          style="min-width: 0; word-break: break-all"
        >
          <span v-if="userStore.user?.email">{{ userStore.user.email }}</span>
          <span v-if="userStore.user?.phonenumber">{{ userStore.user.phonenumber }}</span>
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
      <div class="mt-auto pt-3">
        <VersionInfo />
      </div>
  </div>
</template>
