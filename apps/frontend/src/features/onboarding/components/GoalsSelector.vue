<script setup lang="ts">
import IconDate from '@/assets/icons/app/cupid.svg'
import IconSocialize from '@/assets/icons/app/socialize.svg'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

import type { ProfileScope } from '@zod/profile/profile.dto'

type FormData = {
  scopes: ProfileScope[]
}

// Replace props/emits/watch with defineModel
const model = defineModel<FormData>({
  default: () => ({
    scopes: [],
  }),
})

const toggleSocial = () => {
  const scopes = new Set(model.value.scopes)
  scopes.has('social') ? scopes.delete('social') : scopes.add('social')
  model.value.scopes = Array.from(scopes)
}

const toggleDating = () => {
  const scopes = new Set(model.value.scopes)
  scopes.has('dating') ? scopes.delete('dating') : scopes.add('dating')
  model.value.scopes = Array.from(scopes)
}
</script>

<template>
  <div class="d-flex gap-2 flex-row justify-content-between w-100">
    <div
      class="card btn-social-toggle"
      :class="{ active: model.scopes.includes('social') }"
      @click="toggleSocial"
    >
      <div class="m-4">
        <IconSocialize class="svg-icon-lg h-100 w-100" />
      </div>
      <div class="card-body">
        <p class="card-text">{{ t('onboarding.goals.socializing') }}</p>
      </div>
      <div class="card-footer text-center">
        <div class="form-control-lg">
          <input
            type="checkbox"
            class="form-check-input"
            :checked="model.scopes.includes('social')"
            value="true"
          />
        </div>
      </div>
    </div>

    <div
      class="card btn-dating-toggle"
      :class="{ active: model.scopes.includes('dating') }"
      @click="toggleDating"
    >
      <div class="m-4">
        <IconDate class="svg-icon-lg h-100 w-100" />
      </div>
      <div class="card-body">
        <p class="card-text">{{ t('onboarding.goals.dating') }}</p>
      </div>
      <div class="card-footer text-center">
        <div class="form-control-lg">
          <input
            type="checkbox"
            class="form-check-input"
            :checked="model.scopes.includes('dating')"
            value="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
p {
  line-height: 1.25;
}
</style>
