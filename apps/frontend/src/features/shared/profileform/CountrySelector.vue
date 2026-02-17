<script setup lang="ts">
import { useCountries } from '@/features/shared/composables/useCountries'
import { type LocationPayload, type LocationDTO } from '@zod/dto/location.dto'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Multiselect from 'vue-multiselect'

const { t } = useI18n()

const model = defineModel<LocationPayload>({
  default: () => ({
    cityId: '',
    cityName: '',
    country: '',
  }),
})

const props = defineProps<{
  allowEmpty?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: LocationDTO): void
}>()
const { getCountryOptions } = useCountries()

const countrySelectOptions = getCountryOptions()

const country = computed({
  get: () => countrySelectOptions.find((o) => o.value === model.value.country),
  set: (opt: any) => {
    model.value = {
      ...model.value,
      country: opt?.value ?? '',
    }
  },
})
</script>

<template>
  <div>
    <Multiselect
      v-model="country"
      v-bind:allow-empty="props.allowEmpty"
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
