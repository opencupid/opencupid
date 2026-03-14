<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { useBootstrap } from '@/lib/bootstrap'
import IconCupid from '@/assets/images/app/cupid.svg'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import RouterBackButton from '@/features/shared/ui/RouterBackButton.vue'
import SecondaryNav from '@/features/shared/ui/SecondaryNav.vue'

const router = useRouter()

onMounted(async () => {
  await useBootstrap().bootstrap()
})

function proceed() {
  router.push({ name: 'MyProfile', state: { startDatingWizard: true } })
}
</script>

<template>
  <main class="w-100 position-relative overflow-hidden container-fluid">
    <MiddleColumn class="h-100 d-flex flex-column">
      <SecondaryNav>
        <template #items-left>
          <RouterBackButton />
        </template>
      </SecondaryNav>

      <div class="d-flex flex-column align-items-center justify-content-center flex-grow-1">
        <div
          class="col-3 mx-auto d-flex align-items-center justify-content-center text-dating my-md-2 animate__animated animate__fadeIn"
        >
          <IconCupid class="svg-icon-100 opacity-50" />
        </div>
        <div class="text-center p-4">
          <p class="mb-3 lh-sm form-hint">
            {{ $t('onboarding.wizard.dating_intro_text') }}
          </p>
          <BButton
            variant="primary"
            pill
            class="px-5"
            @click="proceed"
          >
            {{ $t('onboarding.wizard.continue') }}
          </BButton>
        </div>
      </div>
    </MiddleColumn>
  </main>
</template>
