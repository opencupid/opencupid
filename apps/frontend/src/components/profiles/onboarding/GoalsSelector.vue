<script setup lang="ts">
import IconDate from '@/assets/icons/app/cupid.svg'
import IconSocialize from '@/assets/icons/app/socialize.svg'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

type FormData = {
  isSocialActive: boolean
  isDatingActive: boolean
}

// Replace props/emits/watch with defineModel
const model = defineModel<FormData>({
  default: () => ({
    isSocialActive: false,
    isDatingActive: false,
  }),
})

const toggleSocial = () => {
  model.value.isSocialActive = !model.value.isSocialActive
}

const toggleDating = () => {
  model.value.isDatingActive = !model.value.isDatingActive
}
</script>

<template>
  <div class="d-flex gap-2 flex-row justify-content-between w-100">
    <div
      class="card btn-social-toggle"
      :class="{ active: model.isSocialActive }"
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
            :checked="model.isSocialActive"
            value="true"
          />
        </div>
      </div>
    </div>

    <div
      class="card btn-dating-toggle"
      :class="{ active: model.isDatingActive }"
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
            :checked="model.isDatingActive"
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
