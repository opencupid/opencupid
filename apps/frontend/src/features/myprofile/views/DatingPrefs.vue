<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { useBootstrap } from '@/lib/bootstrap'

import { useMyProfileViewModel } from '../composables/useMyProfileViewModel'
import DatingPreferencesForm from '@/features/browse/components/DatingPreferencesForm.vue'
import EditDatingProfile from '../components/EditDatingProfile.vue'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import RouterBackButton from '@/features/shared/ui/RouterBackButton.vue'
import SecondaryNav from '@/features/shared/ui/SecondaryNav.vue'

const router = useRouter()

const { formData, datingPrefs, isLoading, updateProfile, persistDatingPrefs } =
  useMyProfileViewModel(false)

onMounted(async () => {
  await useBootstrap().bootstrap()
})

async function save() {
  await updateProfile()
  await persistDatingPrefs()
  router.back()
}
</script>

<template>
  <main class="w-100 position-relative overflow-hidden d-flex flex-column">
    <BContainer
      fluid
      class="flex-grow-1 overflow-hidden"
    >
      <MiddleColumn class="h-100 d-flex flex-column">
        <SecondaryNav>
          <template #items-left>
            <!-- <RouterBackButton /> -->
          </template>
          <template #items-center>
            {{ $t('profiles.forms.my_dating_profile') }}
          </template>
        </SecondaryNav>

        <section class="w-100 flex-grow-1 overflow-auto hide-scrollbar py-3">
          <BOverlay :show="isLoading">
            <BTabs
              pills
              variant="warning"
              nav-class="justify-content-center"
            >
              <BTab
                :title="$t('profiles.forms.my_dating_profile')"
                active
              >
                <div class="pt-3">
                  <EditDatingProfile
                    v-model="formData"
                    @save="save"
                  />
                </div>
              </BTab>
              <BTab :title="$t('profiles.forms.my_preferences')">
                <div class="pt-3">
                  <DatingPreferencesForm
                    v-if="datingPrefs"
                    v-model="datingPrefs"
                  />
                </div>
              </BTab>
            </BTabs>
          </BOverlay>
        </section>
      </MiddleColumn>
    </BContainer>
    <div
      class="sticky-bottom shadow shadow-lg bg-light-subtle py-3 d-flex justify-content-center gap-2"
    >
      <BButton
        variant="link"
        class="link-secondary"
        @click="router.back()"
      >
        {{ $t('onboarding.wizard.cancel') }}
      </BButton>
      <BButton
        variant="primary"
        pill
        class="px-5"
        @click="save"
      >
        {{ $t('onboarding.wizard.finish') }}
      </BButton>
    </div>
  </main>
</template>
