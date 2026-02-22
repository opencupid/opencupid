<script setup lang="ts">
import ProfileCardPlaceholder from '@/features/publicprofile/components/ProfileCardPlaceholder.vue'
import { BContainer, BRow } from 'bootstrap-vue-next'

withDefaults(
  defineProps<{
    howMany: number
    isAnimated?: boolean
  }>(),
  {
    howMany: 6,
  }
)
</script>

<template>
  <BContainer fluid>
    <BRow
      cols="1"
      cols-sm="2"
      cols-lg="3"
    >
      <BCol
        v-for="n in howMany"
        :key="n"
        class="mb-3"
      >
        <ProfileCardPlaceholder :isAnimated="isAnimated" />
      </BCol>
    </BRow>
  </BContainer>
</template>

<style scoped>
.card {
  opacity: 0.2;
}
:deep(.card img) {
  height: 12rem;
}
</style>
