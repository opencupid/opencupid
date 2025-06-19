<script lang="ts" setup>
import type { UpdateDatingPreferencesPayload, OwnerProfile } from '@zod/profile/profile.dto'
import { computed, reactive, ref, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import VueSlider from 'vue-3-slider-component'
import { type MultiselectOption } from '@/lib/languages'
import { useEnumOptions } from './composables/useEnumOptions'
import { useAgeFields } from './composables/useAgeFields'
// https://github.com/s-sasaki-0529/vue-slider-component

const props = defineProps<{
  modelValue: OwnerProfile
}>()

const emit = defineEmits<{
  (e: 'changed', value: UpdateDatingPreferencesPayload): void
}>()

const formData = reactive<OwnerProfile>({
  ...props.modelValue,
})

const { age } = useAgeFields(props.modelValue.birthday)

// Apply computed defaults after age becomes available
watchEffect(() => {
  if (formData.prefAgeMin == null) {
    formData.prefAgeMin = age.value != null ? age.value - 10 : 18
  }
  if (formData.prefAgeMax == null) {
    formData.prefAgeMax = age.value != null ? age.value + 10 : 100
  }
})

// Sync prop changes into formData
watch(
  () => props.modelValue,
  newVal => Object.assign(formData, newVal),
  { deep: true, immediate: true }
)

const { t } = useI18n()

const { hasKidsPreferenceOptions, genderPreferenceOptions } = useEnumOptions(t)

const genders = genderPreferenceOptions() as MultiselectOption[]
const hasKidsChoices = hasKidsPreferenceOptions() as MultiselectOption[]

const prefAge = computed({
  get: () => {
    const min = formData.prefAgeMin
    const max = formData.prefAgeMax

    const hasCustomMin = min != null
    const hasCustomMax = max != null

    const fallbackMin = age.value != null ? age.value - 10 : 18
    const fallbackMax = age.value != null ? age.value + 10 : 100

    return [hasCustomMin ? min : fallbackMin, hasCustomMax ? max : fallbackMax]
  },
  set: ([min, max]: [number, number]) => {
    formData.prefAgeMin = min
    formData.prefAgeMax = max
    emit('changed', {
      prefAgeMin: min,
      prefAgeMax: max,
      prefGender: formData.prefGender,
      prefKids: formData.prefKids,
    })
  },
})

const ageMaxMin = computed(() => {
  const myAge = age.value
  if (myAge) {
    return {
      min: Math.max(18, myAge - 25),
      max: myAge + 25,
    }
  } else {
    return {
      min: 18,
      max: 100,
    }
  }
})

function handleGenderPrefsUpdate() {
  const changed: UpdateDatingPreferencesPayload = {
    prefGender: formData.prefGender,
    prefKids: formData.prefKids,
    prefAgeMax: formData.prefAgeMax,
    prefAgeMin: formData.prefAgeMin,
  }
  emit('changed', changed)
}
</script>

<template>
  <fieldset>
    <h5>{{ t('profiles.forms.my_preferences') }}</h5>

    <div class="mb-3">
      <div v-if="age">
        <label for="ageRange" class="form-text text-muted">{{ t('profiles.forms.age_range') }}</label>
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
              :min="ageMaxMin.min"
              :max="ageMaxMin.max"
            ></vue-slider>
          </div>
        </div>
      </div>
    </div>

    <div class="mb-3">
      <FormKit
        v-model="formData.prefGender!"
        type="checkbox"
        label=""
        :options="genders"
        help=""
        @update:modelValue="handleGenderPrefsUpdate"
      />
    </div>

    <div class="mb-3">
      <FormKit
        v-model="formData.prefKids!"
        type="checkbox"
        label=""
        :options="hasKidsChoices"
        help=""
        @update:modelValue="handleGenderPrefsUpdate"
      />
    </div>
  </fieldset>
</template>
