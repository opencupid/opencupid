<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import IconMap from '@/assets/icons/interface/map.svg'
import IconSquare from '@/assets/icons/interface/square.svg'

const { t } = useI18n()

const viewModeModel = defineModel<string>({
  type: String,
  required: true,
})
</script>

<template>
  <BButtonGroup :aria-label="t('profiles.browse.views.grid_view_button_hint')" size="sm">
    <BButton
      variant="outline-secondary"
      :title="t('profiles.browse.views.grid_view_button_title')"
      :pressed="viewModeModel === 'grid'"
      @click="viewModeModel = 'grid'"
    >
      <div class="icon-grid">
        <IconSquare class="svg-icon-sm" />
        <IconSquare class="svg-icon-sm" />
        <IconSquare class="svg-icon-sm" />
        <IconSquare class="svg-icon-sm" />
      </div>
    </BButton>

    <BButton
      variant="outline-secondary"
      :title="t('profiles.browse.views.map_view_button_title')"
      :pressed="viewModeModel === 'map'"
      @click="viewModeModel = 'map'"
    >
      <IconMap class="svg-icon" />
    </BButton>
  </BButtonGroup>
</template>
