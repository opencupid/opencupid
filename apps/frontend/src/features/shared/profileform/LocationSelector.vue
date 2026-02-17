<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useKomootStore, type KomootLocation } from '@/features/komoot/stores/komootStore'
import type { LocationDTO } from '@zod/dto/location.dto'
import Multiselect from '@/features/shared/ui/multiselect'

import { useDebounceFn } from '@vueuse/core'
import CountryFlag from '../ui/CountryFlag.vue'

const debouncedAsyncFind = useDebounceFn(async (query: string) => {
  if (!query) {
    komoot.results = selected.value ? [selected.value] : []
    return
  }
  await komoot.search(query, locale.value)
}, 500) // debounce delay in ms

const model = defineModel<LocationDTO>({
  default: () => ({
    country: '',
    cityName: '',
    lat: null,
    lon: null,
  }),
})

const props = withDefaults(
  defineProps<{
    allowEmpty?: boolean
  }>(),
  {
    allowEmpty: false,
  }
)

const { locale, t } = useI18n()
const komoot = useKomootStore()

const showHint = ref(false)
const options = computed(() => komoot.results)
const isLoading = computed(() => komoot.isLoading)

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
  set(val: KomootLocation | null) {
    if (!val) {
      model.value.country = ''
      model.value.cityName = ''
      model.value.lat = null
      model.value.lon = null
      return
    }
    model.value.country = val.country
    model.value.cityName = val.name
    model.value.lat = val.lat
    model.value.lon = val.lon
  },
})

function handleSelected() {
  komoot.results = []
}

onUnmounted(() => {
  komoot.results = []
})
</script>

<template>
  <div class="interests-multiselect">
    <Multiselect
      v-model="selected"
      v-bind:allow-empty="props.allowEmpty"
      :options="options"
      :searchable="true"
      :close-on-select="true"
      :clear-on-select="true"
      :internal-search="false"
      :show-no-results="false"
      :show-no-options="false"
      :loading="isLoading"
      select-label=""
      selected-label=""
      deselect-label=""
      open-direction="top"
      label="name"
      track-by="name"
      @search-change="debouncedAsyncFind"
      @open="showHint = true"
      @close="showHint = false"
      @select="handleSelected"
      :placeholder="t('profiles.forms.city_search_placeholder')"
    >
      <template #option="{ option }">
        <div class="d-flex flex-row align-items-start">
          <span class="flex-grow-1">{{ option.name }}</span>
          <span class="flex-shrink-1 flex-grow-0">{{ option.country }}</span>
        </div>
      </template>
      <template #singleLabel="{}">
        <div class="d-flex flex-row align-items-start">
          <span class="flex-grow-1">{{ selected?.name }}</span>
          <span class="flex-shrink-1 flex-grow-0">
            <CountryFlag
              :code="selected?.country"
              class="ms-1"
              size="20"
              :title="selected?.country"
            />
          </span>
        </div>
      </template>
    </Multiselect>
    <div
      class="mt-1 form-text text-muted hint"
      :class="{ 'opacity-0': !showHint }"
    >
      <!-- <small>{{ t('profiles.forms.city_start_typing') }}</small> -->
    </div>
  </div>
</template>

<style lang="scss" scoped>
.hint {
  transition: opacity 0.3s ease-in-out;
  opacity: 0.5;
}
</style>
