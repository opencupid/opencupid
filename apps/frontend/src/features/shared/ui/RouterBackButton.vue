<script setup lang="ts">
import IconArrowSingleLeft from '@/assets/icons/arrows/arrow-single-left.svg'
</script>
<template>
  <BButton
    @click="$router.back()"
    variant="link-secondary"
    class="d-flex align-items-center mt-2"
    size="lg"
  >
    <IconArrowSingleLeft class="svg-icon-lg" />
  </BButton>
</template>
