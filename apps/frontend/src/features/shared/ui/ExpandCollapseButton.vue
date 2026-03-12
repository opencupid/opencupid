<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ArrowDown from '@/assets/icons/arrows/arrow-single-down.svg'
import ArrowUp from '@/assets/icons/arrows/arrow-single-up.svg'

const { t } = useI18n()

const expanded = defineModel<boolean>({ default: false })
</script>

<template>
  <BButton
    @click="expanded = !expanded"
    variant="link-secondary"
    class="m-0 p-0 w-100 text-center"
  >
    {{ expanded ? t('profiles.forms.fewer_options') : t('profiles.forms.more_options') }}
    <span
      ><component
        :is="expanded ? ArrowUp : ArrowDown"
        class="svg-icon-sm me-1"
    /></span>
  </BButton>
</template>
