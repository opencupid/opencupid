<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import Multiselect from 'vue-multiselect'
import { useCitiesStore } from '@/store/cityStore'
import { useI18n } from 'vue-i18n'

import type { PublicCity } from '@zod/dto/city.dto'
import type { LocationDTO } from '@zod/dto/location.dto'
import { toInitialCaps } from '@/lib/utils'
import { type MultiselectComponent } from '@/types/multiselect'

// Store
const cityStore = useCitiesStore()

// Model
const model = defineModel<LocationDTO>({
  default: () => ({
    cityId: '',
    cityName: '',
    country: '',
  }),
})

const props = defineProps<{
  allowEmpty?: boolean
}>()
// State
const selectOptions = ref<PublicCity[]>([])
const isLoading = ref(false)

const multiselectRef = ref<MultiselectComponent>()

const { t } = useI18n()

// Computed selected city
const selectedCity = computed<PublicCity>({
  get() {
    return {
      id: model.value.cityId || '',
      name: model.value.cityName,
      country: model.value.country,
    }
  },
  set(val: PublicCity) {
    if (!val) return
    model.value = {
      cityId: val.id,
      cityName: val.name,
      country: model.value.country,
    }
  },
})

// Watch for country change and reset city
watch(
  () => model.value.country,
  (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      selectOptions.value = []
      selectedCity.value = {
        id: '',
        name: '',
        country: newVal,
      }
      nextTick(() => {
        // multiselectRef.value?.activate()
      })
    }
  }
)

// Preload existing city if present
onMounted(async () => {
  if (model.value.cityId) {
    try {
      const current = await cityStore.getCity(model.value.cityId)
      if (current) {
        selectedCity.value = current
        selectOptions.value = [current]
      }
    } catch (error) {
      console.error('Failed to fetch cities:', error)
    }
  }
})

// Search cities
async function asyncFind(query: string) {
  if (!query) {
    selectOptions.value = []
    return
  }

  isLoading.value = true
  try {
    selectOptions.value = await cityStore.search(model.value.country, query)
  } catch (error) {
    console.error('Failed to search cities:', error)
  } finally {
    isLoading.value = false
  }
}

// Add new city
async function addCity(name: string) {
  const create = {
    name: toInitialCaps(name.trim()),
    country: model.value.country,
  }
  isLoading.value = true
  try {
    const newCity = await cityStore.create(create)
    selectOptions.value.push(newCity)
    selectedCity.value = newCity
    model.value = {
      cityId: newCity.id,
      cityName: newCity.name,
      country: model.value.country,
    }
  } catch (error) {
    console.error('Failed to add city:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="interests-multiselect">
    <Multiselect
      v-model="selectedCity"
      v-bind:allow-empty="props.allowEmpty"
      ref="multiselectRef"
      :options="selectOptions"
      :searchable="true"
      :close-on-select="true"
      :clear-on-select="false"
      :internal-search="false"
      :taggable="true"
      :show-labels="true"
      :show-no-results="false"
      :show-no-options="false"
      :loading="isLoading"
      :disabled="!model.country"
      open-direction="top"
      label="name"
      track-by="id"
      @search-change="asyncFind"
      @tag="addCity"
      :placeholder="t('profiles.forms.city_search_placeholder')"
      :tag-placeholder="t('profiles.forms.city_add_placeholder')"
    />
    <div class="mt-2 form-text text-muted text-center">
      <small>{{ t('profiles.forms.city_start_typing') }}</small>
    </div>
  </div>
</template>

<style lang="scss">
.interests-multiselect {
  .multiselect__city {
    background-color: var(--bs-warning);
    color: var(--bs-body-bg);

    i:after {
      color: var(--bs-text-secondary);
    }
  }
}
</style>
