<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAgeFields } from '../composables/useAgeFields'

import VueSlider from 'vue-3-slider-component'

const model = defineModel<Date | null>({
  default: () => new Date(new Date().getFullYear() - 18, 1, 1),
})

const birthYear = computed({
  get: () => (model.value ? new Date(model.value).getFullYear() : null),
  set: (year: number) => {
    if (year && year <= birthYearMax.value && year >= birthYearMin.value) {
      model.value = new Date(Date.UTC(year, 1, 1))
    }
  },
})

onMounted(() => {
  // set default value
  if (!model.value) {
    model.value = new Date(new Date().getFullYear() - 18, 1, 1)
  }
})

const { birthYearMin, birthYearMax } = useAgeFields(model.value)
</script>

<template>
  <div class="mb-4">
    <!-- <label for="birthYear">I was born...</label> -->
    <div class="d-flex flex-row align-items-center">
      <div class="flex-grow-1 px-3">
        <vue-slider
          v-model="birthYear"
          :dotSize="20"
          :contained="true"
          :tooltip="'none'"
          :min="birthYearMin"
          :max="birthYearMax"
        ></vue-slider>
        <div
          class="text-center fs-1 text-muted mt-2"
          :class="birthYear ? 'visible' : 'invisible'"
          style="height: 2rem"
        >
          {{ birthYear }}
        </div>
      </div>
    </div>
  </div>
</template>
