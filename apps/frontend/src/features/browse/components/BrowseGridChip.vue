<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconGrid from '@/assets/icons/interface/grid.svg'

/** Floating map button that opens the browse grid, showing how much is in view. */
const props = defineProps<{
  count: number
  loading?: boolean
}>()

defineEmits<{ open: [] }>()

const { t } = useI18n()

const label = computed(() => {
  if (props.loading) return '…'
  return props.count > 0
    ? t('profiles.browse.grid.open_button', { count: props.count })
    : t('profiles.browse.grid.open_button_empty')
})
</script>

<template>
  <button
    type="button"
    class="browse-grid-chip btn btn-dark rounded-pill shadow d-flex align-items-center gap-2 px-3"
    :aria-label="loading ? t('profiles.browse.grid.loading') : label"
    @click="$emit('open')"
  >
    <IconGrid class="svg-icon" />
    <span class="fw-bold">{{ label }}</span>
  </button>
</template>

<style scoped lang="scss">
.browse-grid-chip {
  white-space: nowrap;
}
</style>
