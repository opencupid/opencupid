<script setup lang="ts">
import { type ViewState } from '../composables/types'
import ViewAsDropdown from './ViewAsDropdown.vue'
import DatingModeDropdown from './DatingModeDropdown.vue'
import IconSetting2 from '@/assets/icons/interface/setting-2.svg'
import IconMenuDotsVert from '@/assets/icons/interface/menu-dots-vert.svg'
import IconSlider from '@/assets/icons/interface/setting.svg'
import ChevronRightIcon from '@/assets/icons/arrows/arrow-single-right.svg'

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
}>()
</script>

<template>
  <div >
    <div class="d-flex align-items-center w-100 p-2">
      <!-- Preferences -->
      <DatingModeDropdown
        class="flex-grow-1"
        v-model:is-dating-active="isDatingActive"
        @datingmode:toggle="$emit('datingmode:toggle')"
        @datingmode:prefs="$emit('datingmode:prefs')"
      />

      <!-- View as -->
      <ViewAsDropdown
        v-model="viewState"
        v-model:is-dating-active="isDatingActive"
      />
    </div>

    <BCollapse v-model="isDatingActive">
      <BButton
        variant="light"
        class="btn-subnav w-100 text-start d-flex align-items-center justify-content-between"
        @click="$emit('datingmode:prefs')"
      >
        <span class="flex-grow-1">
          <IconSlider class="svg-icon me-2" />
          {{ $t('profiles.forms.my_dating_profile') }}
        </span>
        <span class="flex-grow-0">
          <ChevronRightIcon class="svg-icon-sm" />
        </span>
      </BButton>
    </BCollapse>
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
.btn-subnav {
  border: none;
  border-radius: 0;
}
</style>
