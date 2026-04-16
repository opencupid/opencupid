<script setup lang="ts">
import { ref } from 'vue'

import { useMyProfileViewModel } from '../composables/useMyProfileViewModel'
import DatingWizardStepper from '@/features/onboarding/components/DatingWizardStepper.vue'
import IconCupid from '@/assets/images/app/cupid.svg'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const showIntro = ref(true)

const { formData, datingPrefs, updateProfile, persistDatingPrefs, updateScopes } =
  useMyProfileViewModel(false)

const handleFinish = async () => {
  const res = await updateProfile()
  if (!res.success) return
  await persistDatingPrefs()
  await updateScopes({ isDatingActive: true })
  emit('close')
}
</script>

<template>
  <div class="d-flex flex-column h-100 w-100">
    <section
      class="w-100 flex-grow-1 d-flex flex-column align-items-center justify-content-center overflow-auto hide-scrollbar p-2 position-relative"
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
            class="h-100 mt-3 mt-md-4 mt-lg-5 d-flex align-items-center flex-column justify-content-center"
          >
            <div
              class="col-3 mx-auto d-flex align-items-center justify-content-center text-dating my-md-2"
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
          </div>
        </template>
      </BOverlay>

      <DatingWizardStepper
        v-if="formData"
        v-model="formData"
        v-model:datingPrefs="datingPrefs"
        @finished="handleFinish"
        @cancel="emit('close')"
      >
        <legend>{{ $t('onboarding.wizard.all_set') }}</legend>
        <p class="text-muted">
          {{ $t('onboarding.wizard.appear_message') }}
        </p>
      </DatingWizardStepper>
    </section>
  </div>
</template>
