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
      variant="link"
      :title="t('profiles.browse.views.grid_view_button_title')"
      :pressed="modelValue === 'grid'"
      class="toggle-btn"
      @click="modelValue = 'grid'"
    >
      <GridButton class="svg-icon" />
    </BButton>
    <BButton
      variant="link"
      :title="t('profiles.browse.views.map_view_button_title')"
      :pressed="modelValue === 'map'"
      class="toggle-btn"
      @click="modelValue = 'map'"
    >
      <IconMap class="svg-icon" />
    </BButton>
  </BButtonGroup>
</template>

<style scoped>
.toggle-btn {
  color: #555;
  text-decoration: none;
  padding: 0.375rem 0.75rem;

  &.active {
    background-color: rgba(0, 0, 0, 0.08);
    color: #000;
  }

  &:hover:not(.active) {
    background-color: rgba(0, 0, 0, 0.04);
    color: #000;
  }
}
</style>
