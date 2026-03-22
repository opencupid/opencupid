<script setup lang="ts">
import { onMounted, ref } from 'vue'
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

const isSaving = ref(false)

async function handleSave() {
  isSaving.value = true
  await Promise.all([updateProfile(), persistDatingPrefs()])
  router.back()
}

async function handleCancel() {
  router.back()
}
</script>

<template>
  <main class="d-flex flex-column">
    <MiddleColumn class="h-100 d-flex flex-column flex-grow-1 overflow-hidden">
      <SecondaryNav>
        <template #items-left>
          <!-- <RouterBackButton /> -->
        </template>
        <template #items-center>
          {{ $t('profiles.forms.my_dating_profile') }}
        </template>
      </SecondaryNav>

      <section class="w-100 flex-grow-1 overflow-auto hide-scrollbar py-3">
        <BTabs
          pills
          variant="warning"
          nav-class="justify-content-center"
        >
          <BTab
            :title="$t('profiles.forms.my_dating_profile')"
            active
          >
            <fieldset
              class="pt-3"
              :disabled="isSaving || isLoading"
            >
              <EditDatingProfile
                v-model="formData"
                @save="handleSave"
              />
            </fieldset>
          </BTab>
          <BTab :title="$t('profiles.forms.my_preferences')">
            <fieldset
              class="pt-3"
              :disabled="isSaving || isLoading"
            >
              <DatingPreferencesForm
                v-if="datingPrefs"
                v-model="datingPrefs"
              />
            </fieldset>
          </BTab>
        </BTabs>
      </section>
    </MiddleColumn>
    <div
      class="sticky-bottom shadow shadow-lg bg-light-subtle py-3 d-flex justify-content-center gap-2"
    >
      <BButton
        variant="link"
        class="link-secondary"
        @click="handleCancel"
      >
        {{ $t('onboarding.wizard.cancel') }}
      </BButton>
      <BButton
        variant="primary"
        pill
        class="px-5"
        @click.stop="handleSave"
        :disabled="isLoading"
      >
        {{ $t('onboarding.wizard.finish') }}
      </BButton>
    </div>
  </main>
</template>
