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
  <div class="d-flex gap-2 flex-column justify-content-between w-100">
    <div
      class="card btn-social-toggle clickable mb-2"
      :class="{ active: model.isSocialActive }"
      @click="toggleSocial"
    >
      <div class="card-body d-flex flex-row align-items-center">
        <div class="col-4 col-sm-3 p-sm-3">
          <IconSocialize class="svg-icon-lg h-100 w-100" />
        </div>
        <p class="m-0 ps-2 p-sm-4 flex-grow-1">{{ t('onboarding.goals.socializing') }}</p>
        <div class="text-center flex-shrink-1">
          <div class="form-control-lg m-0 p-0 ms-2 p-sm-2 d-flex  align-items-center">
            <input
              type="checkbox"
              class="form-check-input"
              :checked="model.isSocialActive"
              value="true"
            />
          </div>
        </div>
      </div>
    </div>

    <div
      class="card btn-dating-toggle clickable"
      :class="{ active: model.isDatingActive }"
      @click="toggleDating"
    >
      <div class="card-body d-flex flex-row align-items-center">
        <div class="col-4 col-sm-3 p-sm-3">
          <IconDate class="svg-icon-lg h-100 w-100" />
        </div>
        <p class="m-0 ps-2 p-sm-4 flex-grow-1">{{ t('onboarding.goals.dating') }}</p>
        <div class="text-center">
          <div class="form-control-lg m-0 p-0 ms-2 p-sm-2 d-flex  align-items-center">
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
  </div>
</template>
<style scoped>
p {
  line-height: 1.25;
}
</style>
