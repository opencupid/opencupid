<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import VueSlider from 'vue-3-slider-component'

import { DatingPreferencesFormSchema } from '@zod/match/filters.form'
import GenderPreferenceSelector from './GenderPreferenceSelector.vue'
import HasKidsPreferenceSelector from './HaskidsPreferenceSelector.vue'
import { type DatingPreferencesFormType } from '@zod/match/filters.form'

// https://github.com/s-sasaki-0529/vue-slider-component

const model = defineModel<DatingPreferencesFormType>({
  default: () => DatingPreferencesFormSchema.parse({}),
})

const { t } = useI18n()

const prefAge = computed({
  get: () => [model.value.prefAgeMin, model.value.prefAgeMax],
  set: ([min, max]: [number, number]) => {
    model.value.prefAgeMin = min
    model.value.prefAgeMax = max
  },
})
</script>

<template>
  <fieldset class="d-flex flex-column h-100">
    <div class="mb-3">
      <div>
        <label
          for="ageRange"
          class="form-text text-muted"
          >{{ t('profiles.forms.age_range') }}</label
        >
        <div class="d-flex flex-row align-items-center">
          <div class="fs-2 me-2 px-4">{{ prefAge[0] }} - {{ prefAge[1] }}</div>
          <div class="flex-grow-1 px-3">
            <vue-slider
              v-model="prefAge"
              id="ageRange"
              :dotSize="20"
              :contained="true"
              :tooltip="'none'"
              :enable-cross="false"
              :min="18"
              :max="100"
            ></vue-slider>
          </div>
        </div>
      </div>
    </div>

    <div
      class="mb-sm-2 mb-md-3"
      style="min-height: 0; flex: 0 1 auto"
    >
      <GenderPreferenceSelector v-model="model.prefGender" />
    </div>

    <div class="mb-sm-2 mb-md-3">
      <HasKidsPreferenceSelector v-model="model.prefKids" />
    </div>
  </fieldset>
</template>
