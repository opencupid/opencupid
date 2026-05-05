<script setup lang="ts">
// Presentational chip rendering the placeholder-chip + placeholder line in
// a square aspect-ratio container. Used directly as the visual for an
// anonymous-like option (e.g. inside AnonymousToggle), and embedded in
// AnonymousLikeCard which wraps it with a click popover for list contexts.
import { computed } from 'vue'
import type { GenderType } from '@zod/generated'
import IconFemale from '@/assets/icons/interface/user-female.svg'
import IconMale from '@/assets/icons/interface/user-male.svg'
import IconNeutral from '@/assets/icons/interface/user.svg'

const props = defineProps<{
  gender?: GenderType
}>()

const showMale = computed(() => props.gender === 'male')
const showFemale = computed(() => props.gender === 'female')
const showNeutral = computed(() => !showMale.value && !showFemale.value)
</script>

<template>
  <div
    class="rounded-3 d-flex flex-column align-items-center justify-content-center gap-2 p-2 h-100"
  >
    <div class="placeholder-chip dating-eligible-highlight d-flex align-items-center justify-content-center">
      <IconFemale v-if="showFemale" class="svg-icon-lg text-dating m-1 h-75" />
      <IconMale v-if="showMale" class="svg-icon-lg text-dating m-1 h-75" />
      <IconNeutral v-if="showNeutral" class="svg-icon-lg text-dating w-100 m-1 h-75" />
    </div>
    <span class="publicname-placeholder w-75"></span>
  </div>
</template>

<style scoped>
.placeholder-chip {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  /* background-color: var(--bs-dating); */
  /* background-color: rgba(0,0,0,0.1); */
  background-color: transparent;
  opacity: 0.4;
}
.publicname-placeholder {
  display: block;
  height: 0.75rem;
  background-color: var(--bs-secondary);
  opacity: 0.1;
}
</style>
