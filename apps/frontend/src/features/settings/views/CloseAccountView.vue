<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/features/auth/stores/authStore'
import { useUserStore } from '@/store/userStore'
import { useBootstrap } from '@/lib/bootstrap'

import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import RouterBackButton from '@/features/shared/ui/RouterBackButton.vue'
import SecondaryNav from '@/features/shared/ui/SecondaryNav.vue'
import { BSpinner } from 'bootstrap-vue-next'

const authStore = useAuthStore()
const userStore = useUserStore()
const router = useRouter()

const confirmInput = ref('')

const userIdentifier = computed(() => userStore.user?.email ?? userStore.user?.phonenumber ?? null)

const isConfirmed = computed(
  () =>
    !!userIdentifier.value &&
    confirmInput.value.trim().toLowerCase() === userIdentifier.value.toLowerCase()
)

onMounted(async () => {
  await useBootstrap().bootstrap()
  await userStore.fetchUser()
})

const isDeleting = ref(false)

async function handleCloseAccount() {
  if (!isConfirmed.value) return
  isDeleting.value = true
  const result = await userStore.deleteAccount()
  isDeleting.value = false
  if (result.success) {
    authStore.logout()
    router.push({ name: 'Login' })
  }
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
            {{ $t('settings.close_account_dialog_title') }}
          </template>
          <template #items-right>&nbsp;</template>
        </SecondaryNav>

        <section class="w-100 flex-grow-1">
          <div class="h-100 d-flex flex-column justify-content-center">
            <p>{{ $t('settings.close_account_dialog_message') }}</p>
            <div class="mb-4">
              <BFormLabel for="close-account-confirm">
                {{ $t('settings.close_account_confirm_label') }}
              </BFormLabel>
              <BFormInput
                id="close-account-confirm"
                v-model="confirmInput"
                type="text"
                autocomplete="off"
                class="mt-2"
              />
            </div>
            <div class="d-flex gap-2 justify-content-center">
              <BButton
                variant="link"
                class="link-secondary"
                @click="router.back()"
              >
                {{ $t('uicomponents.dialog_cancel_button') }}
              </BButton>

              <BButton
                variant="danger"
                :disabled="!isConfirmed || userStore.isLoading || isDeleting"
                @click="handleCloseAccount"
              >
                <span v-if="isDeleting">
                  <BSpinner small />
                  {{ $t('settings.close_account_ok_button') }}
                </span>
                <span v-else>
                  {{ $t('settings.close_account_ok_button') }}
                </span>
              </BButton>
            </div>
          </div>
        </section>
      </div>
    </MiddleColumn>
  </main>
</template>
