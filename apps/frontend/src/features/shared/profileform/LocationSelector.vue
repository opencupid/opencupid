<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'
import { useKomootStore, type KomootLocation } from '@/features/komoot/stores/komootStore'
import type { LocationDTO } from '@zod/dto/location.dto'

const { locale, t } = useI18n()
const komoot = useKomootStore()

const props = withDefaults(
  defineProps<{
    allowEmpty?: boolean
  }>(),
  { allowEmpty: false }
)

const model = defineModel<LocationDTO>({
  default: () => ({
    country: '',
    cityId: null,
    cityName: '',
    lat: null,
    lon: null,
  }),
})

const query = ref(model.value.cityName)
// const inputValue = computed({
//   get() {
//     return query.value
//   },
//   set(val) {
//     query.value = val
//   },
// })
const showHint = ref(false)
const isLoading = computed(() => komoot.isLoading)
const results = computed(() => komoot.results)

const debouncedSearch = useDebounceFn(async () => {
  if (!query.value) {
    komoot.results = selected.value ? [selected.value] : []
    return
  }
  await komoot.search(query.value, locale.value)
}, 500)

watch(query, () => {
  debouncedSearch()
})

const selected = computed<KomootLocation | null>({
  get() {
    if (!model.value.cityName) return null
    return {
      name: model.value.cityName,
      country: model.value.country,
      lat: model.value.lat ?? 0,
      lon: model.value.lon ?? 0,
    }
  },
  set(val) {
    if (!val) {
      model.value = {
        country: '',
        cityId: null,
        cityName: '',
        lat: null,
        lon: null,
      }
      return
    }
    model.value = {
      country: val.country,
      cityId: null, // if needed, populate from another source
      cityName: val.name,
      lat: val.lat,
      lon: val.lon,
    }
  },
})

function select(option: KomootLocation) {
  selected.value = option
  query.value = option.name
  komoot.results = []
}
</script>

<template>
  <div class="interests-multiselect position-relative">
    <!-- Fixed-height scrollable suggestions above input -->
    <div
      v-if="results.length"
      class="position-relative overflow-auto border rounded mb-2"
      :class="{'visibility-hidden': !results.length}"
      style="height: 8rem"
    >
      <a
        v-for="option in results"
        :key="option.name"
        href="#"
        class="list-group-item list-group-item-action py-1 px-2 "
        @click="select(option)"
      >
        <div class="d-flex align-items-center">
          <span class="flex-grow-1">
            {{ option.name }}
          </span>
          <span class="text-muted small flex-shrink-1">
            {{ option.country ? option.country : '' }}
          </span>
        </div>
      </a>
    </div>

    <!-- Text input for async search -->
    <BFormInput
      v-model="query"
      :placeholder="t('profiles.forms.city_search_placeholder')"
      @focus="showHint = true"
    />

    <!-- Optional hint below input -->
    <div class="mt-1 form-text text-muted hint" :class="{ 'opacity-0': !showHint }">
      <small>{{ t('profiles.forms.city_start_typing') }}</small>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.hint {
  transition: opacity 0.3s ease-in-out;
  opacity: 0.5;
}
</style>
