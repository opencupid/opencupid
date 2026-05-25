<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import IconHide from '@/assets/icons/interface/hide.svg'
import IconShow from '@/assets/icons/interface/unhide.svg'

const { t } = useI18n()

const visible = defineModel<boolean>({ default: true })

defineProps<{
  label: string
}>()
</script>

<template>
  <BFormGroup class="d-flex align-items-center">
    <BButton
      variant="link-secondary"
      size="sm"
      v-model:pressed="visible"
      :title="
        visible
          ? t('uicomponents.visibility_toggle.hide')
          : t('uicomponents.visibility_toggle.show')
      "
      :aria-label="
        visible
          ? t('uicomponents.visibility_toggle.hide')
          : t('uicomponents.visibility_toggle.show')
      "
    >
      <IconShow
        v-if="visible"
        class="svg-icon"
      />
      <IconHide
        v-else
        class="svg-icon"
      />
    </BButton>
    {{ label }}
  </BFormGroup>
</template>

<style scoped></style>
