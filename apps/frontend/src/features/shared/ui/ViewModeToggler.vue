<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import GridButton from './GridButton.vue'
import IconMap from '@/assets/icons/interface/map.svg'

const modelValue = defineModel<string>({ required: true })
const { t } = useI18n()
</script>

<template>
  <BButtonGroup
    aria-label="Toggle view mode"
    size="sm"
  >
    <BButton
      variant="outline-dark"
      :title="t('profiles.browse.views.grid_view_button_title')"
      :pressed="modelValue === 'grid'"
      @click="modelValue = 'grid'"
    >
      <GridButton class="svg-icon" />
    </BButton>
    <BButton
      variant="outline-dark"
      :title="t('profiles.browse.views.map_view_button_title')"
      :pressed="modelValue === 'map'"
      @click="modelValue = 'map'"
    >
      <IconMap class="svg-icon" />
    </BButton>
  </BButtonGroup>
</template>
