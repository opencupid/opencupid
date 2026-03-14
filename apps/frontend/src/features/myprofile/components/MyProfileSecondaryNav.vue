<script setup lang="ts">
import { type ViewState } from '../composables/types'
import ViewAsDropdown from './ViewAsDropdown.vue'
import DatingModeDropdown from './DatingModeDropdown.vue'
import IconSetting2 from '@/assets/icons/interface/setting-2.svg'
import IconMenuDotsVert from '@/assets/icons/interface/menu-dots-vert.svg'

defineProps<{
  isDatingOnboarded: boolean
}>()

const viewState = defineModel<ViewState>({
  default: {
    scopes: [],
    currentScope: 'dating',
  },
  required: true,
})

const isDatingActive = defineModel<boolean>('isDatingActive', {
  default: false,
})

const emit = defineEmits<{
  (e: 'datingmode:toggle'): void
  (e: 'datingmode:prefs'): void
  (e: 'datingmode:profile'): void
}>()
</script>

<template>
  <div class="d-flex justify-content-end align-items-center w-100">
    <BNav>
      <!-- View as -->
      <ViewAsDropdown
        v-model="viewState"
        v-model:is-dating-active="isDatingActive"
      />

      <!-- Preferences -->
      <DatingModeDropdown
        v-model:is-dating-active="isDatingActive"
        @datingmode:toggle="$emit('datingmode:toggle')"
        @datingmode:prefs="$emit('datingmode:prefs')"
        @datingmode:profile="$emit('datingmode:profile')"
      />

      <!-- Settings -->
      <BNavItemDropdown>
        <template #button-content>
          <span class="text-secondary">
            <IconMenuDotsVert class="svg-icon-lg fs-4" />
          </span>
        </template>
        <BDropdownItem to="/settings">
          <IconSetting2 class="svg-icon me-1" />
          {{ $t('settings.title') }}
        </BDropdownItem>
      </BNavItemDropdown>
    </BNav>
  </div>
</template>
<style scoped>
/* hide dropdown caret */
:deep(button:after) {
  content: none !important;
  display: none !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style>
