<script setup lang="ts">
import { computed } from 'vue'
import { useLocalStore, type SendMode } from '@/store/localStore'
import IconMenuDotsVert from '@/assets/icons/interface/menu-dots-vert.svg'

const localStore = useLocalStore()
const sendMode = computed(() => localStore.getSendMode)

function setSendMode(mode: SendMode) {
  localStore.setSendMode(mode)
}
</script>

<template>
  <BDropdown
    variant="link"
    no-caret
    toggle-class="text-decoration-none p-0 text-muted"
    size="sm"
    menu-class="send-mode-menu"
    end
  >
    <template #button-content>
      <IconMenuDotsVert class="svg-icon-lg fs-4" />
    </template>
    <BDropdownItem
      @click="setSendMode('enter')"
      :active="sendMode === 'enter'"
    >
      <input
        type="radio"
        class="form-check-input me-2"
        :checked="sendMode === 'enter'"
        disabled
      />
      {{ $t('messaging.send_mode_press_enter') }}
    </BDropdownItem>
    <BDropdownItem
      @click="setSendMode('click')"
      :active="sendMode === 'click'"
    >
      <input
        type="radio"
        class="form-check-input me-2"
        :checked="sendMode === 'click'"
        disabled
      />
      {{ $t('messaging.send_mode_click') }}
    </BDropdownItem>
  </BDropdown>
</template>

<style scoped>
.send-mode-menu {
  min-width: 200px;
}
</style>
