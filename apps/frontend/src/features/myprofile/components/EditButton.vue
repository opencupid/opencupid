<script setup lang="ts">
import { type ViewState } from '../composables/types'
import IconTick from '@/assets/icons/interface/tick.svg'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import IconPencil2 from '@/assets/icons/interface/pencil-2.svg'
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons'
const editState = defineModel<boolean>({
  default: false,
})
</script>

<template>
  <Transition
    name="scale"
    mode="out-in"
  >
    <BButton
      v-if="editState"
      size="lg"
      class="btn-icon-lg"
      key="edit"
      @click="editState = false"
      variant="success"
      :title="$t('profiles.forms.save_changes_hint')"
    >
      <IconTick class="svg-icon me-1" />
    </BButton>
    <BButton
      v-else
      size="lg"
      class="btn-icon-lg"
      key="save"
      @click="editState = true"
      variant="primary"
      :title="$t('profiles.forms.edit_button_hint')"
    >
      <FontAwesomeIcon
        :icon="faPenToSquare"
        class="animate__animated animate__fadeIn"
      />
      <!-- <IconPencil2 class="svg-icon-lg" /> -->
    </BButton>
  </Transition>
</template>

<style scoped>
.scale-enter-active,
.scale-leave-active {
  transition: transform 0.3s ease;
  transition: opacity 0.25s ease;
}
.scale-enter-from,
.scale-leave-to {
  transform: scale(0.9);
  opacity: 0.7;
}
.scale-enter-to,
.scale-leave-from {
  opacity: 1;
}
</style>
