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
  <main class="w-100 position-relative overflow-hidden container-fluid">
    <MiddleColumn class="h-100 d-flex flex-column">
      <SecondaryNav>
        <template #items-left>
          <RouterBackButton />
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
                @cancel="router.back()"
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
  </main>
</template>
