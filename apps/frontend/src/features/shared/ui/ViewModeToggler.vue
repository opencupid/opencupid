<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import GridButton from './GridButton.vue'
import IconMap from '@/assets/icons/interface/map.svg'

const modelValue = defineModel<string>({ required: true })
const { t } = useI18n()

const modes = [
  { value: 'grid', icon: GridButton, title: 'profiles.browse.views.grid_view_button_title' },
  { value: 'map', icon: IconMap, title: 'profiles.browse.views.map_view_button_title' },
]
</script>

<template>
  <BButtonGroup
    aria-label="Toggle view mode"
    size="sm"
  >
    <BButton
      v-for="mode in modes"
      :key="mode.value"
      variant="outline-secondary"
      :title="t(mode.title)"
      :pressed="modelValue === mode.value"
      @click="modelValue = mode.value"
    >
      <component
        :is="mode.icon"
        class="svg-icon"
      />
    </BButton>
  </BButtonGroup>
</template>
