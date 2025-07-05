<script setup lang="ts">
import IconSetting from '@/assets/icons/interface/setting.svg'
import ScopeViewToggler from '@/features/shared/ui/ScopeViewToggler.vue'
import { type ProfileScope } from '@zod/profile/profile.dto'

const currentScope = defineModel<ProfileScope | null>()

defineEmits<{
  (event: 'prefs:toggle'): void
}>()


</script>

<template>
  <div class="w-100 d-flex align-items-center">
    <div class="col-2">
      <slot name="items-left"></slot>
    </div>
    <div class="col-8 d-flex nav-item justify-content-center align-items-center">
      <ScopeViewToggler v-model="currentScope" />
    </div>
    <div class="col-2 d-flex justify-content-end">
      <!-- <BButton
        variant="outline-secondary"
        pill
        class="ms-2"
        @click="$emit('prefs:toggle')"
        :disabled="prefsButtonDisabled"
      >
        <IconSetting class="svg-icon" />
      </BButton> -->
    </div>
  </div>
</template>
