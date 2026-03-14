<script setup lang="ts">
import IconArrowSingleLeft from '@/assets/icons/arrows/arrow-single-left.svg'
</script>
<template>
  <BButton
    @click="$router.back()"
    variant="link-secondary"
    class="d-flex align-items-center mt-2"
    size="lg"
    :title="$t('uicomponents.back_button_title')"
  >
    <slot> <IconArrowSingleLeft class="svg-icon-lg" /></slot>
  </BButton>
</template>
