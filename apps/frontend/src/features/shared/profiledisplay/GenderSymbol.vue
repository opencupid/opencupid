<script lang="ts" setup>
import { type GenderType } from '@zod/generated'
import { genderIcons } from './genderIcons'

const props = defineProps<{
  gender: GenderType
}>()

const IconComponent = genderIcons[props.gender]
</script>

<template>
  <span class="icon-wrapper">
    <component
      :is="IconComponent"
      v-if="gender && gender !== 'unspecified'"
      class="svg-icon gender-icon"
    />
  </span>
</template>

<style scoped>
.icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
}
.gender-icon {
  height: 1rem;
  fill: currentColor;
}
</style>
