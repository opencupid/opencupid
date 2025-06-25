<script setup lang="ts">
import IconSetting from '@/assets/icons/interface/setting.svg'
import ScopeViewToggler from '@/components/profiles/ScopeViewToggler.vue'
import { type ProfileScope } from '@zod/profile/profile.dto'

const currentScope = defineModel<ProfileScope | null>()

defineEmits<{
  (event: 'edit:datingPrefs'):void,
  (event: 'scope:change', scope: ProfileScope): void
}>()

defineProps<{
  prefsButtonDisabled?: boolean
}>()
</script>

<template>
  <ul pills class="nav nav-pills w-100 d-flex align-items-center">
    <li class="col-2">
      <slot name="items-left"></slot>
    </li>

    <li class="col-8 d-flex nav-item justify-content-center align-items-center">
      <ScopeViewToggler v-model="currentScope" @change="(scope) => $emit('scope:change', scope)" />
    </li>

    <li class="col-2 d-flex justify-content-end">
      <BButton
        variant="secondary"
        pill
        class="ms-2"
        @click="$emit('edit:datingPrefs')"
        :disabled="prefsButtonDisabled"
      >
        <IconSetting class="svg-icon" />
      </BButton>
    </li>
  </ul>
</template>
