<script setup lang="ts">
import { computed, ref } from 'vue'
import Multiselect from 'vue-multiselect'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import type { LocationDTO } from '@zod/dto/location.dto'

const model = defineModel<LocationDTO>({
  default: () => ({
    country: '',
    cityId: null,
    cityName: '',
    lat: null,
    lon: null,
  }),
})

const props = withDefaults(defineProps<{ allowEmpty?: boolean }>(), { allowEmpty: false })

const { locale, t } = useI18n()

interface Option {
  name: string
  country: string
  lat: number
  lon: number
}

const options = ref<Option[]>([])
const isLoading = ref(false)
const showHint = ref(false)

const selected = computed<Option | null>({
  get() {
    if (!model.value.cityName) return null
    return {
      name: model.value.cityName,
      country: model.value.country,
      lat: model.value.lat ?? 0,
      lon: model.value.lon ?? 0,
    }
  },
  set(val: Option | null) {
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

async function asyncFind(query: string) {
  if (!query) {
    options.value = selected.value ? [selected.value] : []
    return
  }
  isLoading.value = true
  try {
    const res = await axios.get('https://photon.komoot.io/api/', {
      params: { q: query, lang: locale.value },
    })
    options.value = (res.data.features || []).map((f: any) => ({
      name: f.properties.name,
      country: f.properties.country,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
    }))
  } catch (err) {
    console.error('Location search failed:', err)
  } finally {
    isLoading.value = false
  }
}
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
      open-direction="top"
      label="name"
      track-by="name"
      @search-change="asyncFind"
      @open="showHint = true"
      @close="showHint = false"
      :placeholder="t('profiles.forms.city_search_placeholder')"
    />
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
