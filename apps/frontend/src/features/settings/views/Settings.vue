<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

import { useColorMode } from 'bootstrap-vue-next'
import { type LoginUser } from '@zod/user/user.dto'

import { useMessageStore } from '@/features/messaging/stores/messageStore'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useLocalStore } from '@/store/localStore'

import IconSetting2 from '@/assets/icons/interface/setting-2.svg'
import IconLogout from '@/assets/icons/interface/logout.svg'

import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import LoadingComponent from '@/features/shared/ui/LoadingComponent.vue'
import LogoutButton from '@/features/auth/components/LogoutButton.vue'
import LanguageSelectorDropdown from '../../shared/ui/LanguageSelectorDropdown.vue'
import PushPermissions from '../components/PushPermissions.vue'
import VersionInfo from '../components/VersionInfo.vue'
import RouterBackButton from '@/features/shared/ui/RouterBackButton.vue'
import SecondaryNav from '@/features/shared/ui/SecondaryNav.vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const authStore = useAuthStore()
const router = useRouter()
const localStore = useLocalStore()

const user = reactive({} as LoginUser)
const isLoading = ref(true)
const isSaving = ref(false)

// const mode = useColorMode({
//   selector: 'html',
//   attribute: 'data-bs-theme',
//   storageKey: 'theme',
//   modes: {
//     light: 'light',
//     dark: 'dark',
//   },
// })

// watch(mode, newMode => {
//   localStore.setTheme(newMode)
// })

// const changeColor = () => {
//   mode.value = mode.value === 'dark' ? 'light' : 'dark'
// }

onMounted(async () => {
  isLoading.value = true
  // mode.value = localStore.getTheme as any
  const res = await authStore.fetchUser()

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

async function handleNewsletterOptInChange(event: Event) {
  const checkbox = event.target as HTMLInputElement
  const newValue = checkbox.checked
  
  isSaving.value = true
  try {
    const res = await authStore.updateUser({ newsletterOptIn: newValue })
    if (res.success) {
      user.newsletterOptIn = newValue
    } else {
      // Revert checkbox if update failed
      checkbox.checked = !newValue
      console.error('Failed to update newsletter preference:', res.message)
    }
  } catch (error) {
    // Revert checkbox if update failed
    checkbox.checked = !newValue
    console.error('Failed to update newsletter preference:', error)
  } finally {
    isSaving.value = false
  }
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

        <section class="w-100 flex-grow-1">
          <BOverlay :show="false" class="h-100 d-flex flex-column justify-content-center">
            <div class="mb-3">
              <div class="me-2">
                <span v-if="user.email"> {{ $t('auth.email') }}: {{ user.email }}</span>
                <span v-if="user.phonenumber">
                  {{ $t('auth.phone_number') }}: {{ user.phonenumber }}</span
                >
              </div>
              <BButton variant="primary" size="sm" @click="handleClick">
                <IconLogout class="svg-icon" />
                {{ $t('authentication.logout') }}</BButton
              >
            </div>

            <div class="mb-3"></div>

            <!-- <div class="mb-3">
      <button class="btn btn-secondary" @click="changeColor">Toggle night or day</button>
    </div> -->

            <!-- <div class="mb-3">
      <PushPermissions />
    </div> -->
            <fieldset class="mb-3">
              <legend for="language-selector" class="form-label">
                {{ t('settings.language_label') }}
              </legend>
              <LanguageSelectorDropdown size="md" />
            </fieldset>
            
            <fieldset class="mb-3">
              <div class="form-check">
                <input
                  id="newsletter-opt-in"
                  type="checkbox"
                  class="form-check-input"
                  :checked="user.newsletterOptIn"
                  :disabled="isSaving"
                  @change="handleNewsletterOptInChange"
                />
                <label class="form-check-label" for="newsletter-opt-in">
                  {{ t('settings.newsletter_opt_in') }}
                </label>
              </div>
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
