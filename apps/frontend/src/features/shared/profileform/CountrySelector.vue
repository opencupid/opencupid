<script setup lang="ts">
import { useCountries } from '@/features/shared/composables/useCountries'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Multiselect from 'vue-multiselect'

const { t } = useI18n()

// Use defineModel instead of props/emits
const model = defineModel<string>({
  default: '',
})

const { getCountryOptions } = useCountries()

const countrySelectOptions = getCountryOptions()

const country = computed({
  get: () => countrySelectOptions.find(o => o.value === model.value),
  set: (opt: any) => {
    model.value = opt?.value ?? ''
  },
})
</script>

<template>
  <div>
    <Multiselect
      v-model="country"
      :options="countrySelectOptions"
      :close-on-select="true"
      :clear-on-select="false"
      open-direction="top"
      :required="true"
      :placeholder="t('onboarding.country_placeholder')"
      :show-labels="false"
      :show-no-results="false"
      :internal-search="true"
      label="label"
      track-by="label"
    />
  </div>
</template>
