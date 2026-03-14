<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useBootstrap } from '@/lib/bootstrap'
import { useMyProfileViewModel } from '../composables/useMyProfileViewModel'

import DatingWizardStepper from '@/features/onboarding/components/DatingWizardStepper.vue'
import IconCupid from '@/assets/images/app/cupid.svg'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import RouterBackButton from '@/features/shared/ui/RouterBackButton.vue'
import SecondaryNav from '@/features/shared/ui/SecondaryNav.vue'
import IconClose from '@/assets/icons/interface/cross.svg'

const router = useRouter()
const showIntro = ref(true)

const { formData, datingPrefs, updateProfile, persistDatingPrefs, updateScopes } =
  useMyProfileViewModel(false)

onMounted(async () => {
  await useBootstrap().bootstrap()
})

const handleFinish = async () => {
  const res = await updateProfile()
  if (!res.success) return
  await persistDatingPrefs()
  await updateScopes({ isDatingActive: true })
  router.push({ name: 'BrowseProfiles' })
}
</script>

<template>
  <main class="w-100 position-relative overflow-hidden container-fluid">
    <MiddleColumn class="h-100 d-flex flex-column">
      <SecondaryNav>
        <template #items-right>
          <RouterBackButton> <IconClose class="svg-icon" /> </RouterBackButton>
        </template>
        <template #items-center>
          {{ $t('onboarding.wizard.dating_modal_title') }}
        </template>
      </SecondaryNav>

      <section
        class="w-100 flex-grow-1 d-flex flex-column align-items-center justify-content-center overflow-auto hide-scrollbar p-2 p-md-5 position-relative"
      >
        <BOverlay
          :show="showIntro"
          no-wrap
          no-center
          variant="light-subtle"
          opacity="0.95"
          blur="5px"
        >
          <template #overlay>
            <div
              class="col-3 mx-auto d-flex align-items-center justify-content-center text-dating my-md-2 animate__animated animate__fadeIn"
            >
              <IconCupid class="svg-icon-100 opacity-25" />
            </div>
            <div class="text-center p-4">
              <p class="mb-3">
                {{ $t('onboarding.wizard.dating_intro_text') }}
              </p>
              <BButton
                variant="primary"
                pill
                class="px-5"
                @click="showIntro = false"
              >
                {{ $t('onboarding.wizard.continue') }}
              </BButton>
            </div>
          </template>
        </BOverlay>

        <DatingWizardStepper
          v-model="formData"
          v-model:datingPrefs="datingPrefs"
          @finished="handleFinish"
          @cancel="router.back()"
        >
          <div
            class="col-6 mx-auto d-flex align-items-center justify-content-center text-dating mb-2 mb-md-4 animate__animated animate__fadeIn"
          >
            <IconCupid class="svg-icon-100 opacity-50" />
          </div>
          <div class="mb-3 d-flex flex-column align-items-center">
            <BFormCheckbox
              v-model="formData.isDatingActive"
              switch
              size="lg"
            >
              {{ $t('onboarding.dating_mode_switch') }}
            </BFormCheckbox>
            <p class="text-muted text-center">
              <span v-if="formData.isDatingActive">
                {{ $t('onboarding.dating_mode_step_hint_active') }}
              </span>
              <span v-else>
                {{ $t('onboarding.dating_mode_step_hint_inactive') }}
              </span>
            </p>
          </div>
        </DatingWizardStepper>
      </section>
    </MiddleColumn>
  </main>
</template>
