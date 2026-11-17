<script setup lang="ts">
import { computed } from 'vue'
import { useAppColorMode } from '../composables/useAppColorMode'

import IconSun from '@/assets/icons/interface/sun.svg'
import IconNight from '@/assets/icons/weather/night.svg'

defineOptions({ name: 'ColorModeToggle' })

const mode = useAppColorMode()
const isDark = computed(() => mode.value === 'dark')

function toggle() {
  mode.value = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <BButton
    variant="link-secondary"
    class="p-0 flex-shrink-0"
    :aria-label="isDark ? $t('settings.color_mode_light') : $t('settings.color_mode_dark')"
    @click="toggle"
  >
    <!-- Shows the mode the button switches to -->
    <IconSun
      v-if="isDark"
      class="svg-icon"
    />
    <IconNight
      v-else
      class="svg-icon"
    />
  </BButton>
</template>
