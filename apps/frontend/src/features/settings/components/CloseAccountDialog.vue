<script setup lang="ts">
import { ref, computed } from 'vue'

const show = defineModel<boolean>()

const props = defineProps<{
  userEmail: string | null
  loading: boolean
}>()

defineEmits<{
  (e: 'confirm'): void
}>()

const confirmInput = ref('')

const isConfirmed = computed(
  () => confirmInput.value.trim().toLowerCase() === (props.userEmail ?? '').toLowerCase()
)
</script>

<template>
  <BModal
    size="md"
    fullscreen="sm"
    centered
    button-size="md"
    :show="show"
    :focus="false"
    :busy="loading"
    :title="$t('settings.close_account_dialog_title')"
    :ok-title="$t('settings.close_account_ok_button')"
    :cancel-title="$t('uicomponents.dialog_cancel_button')"
    :ok-disabled="!isConfirmed"
    ok-variant="danger"
    cancel-variant="link"
    cancel-class="link-secondary"
    header-variant="danger"
    initial-animation
    @ok.prevent="$emit('confirm')"
    @cancel="show = false"
    @hidden="
      show = false
      confirmInput = ''
    "
  >
    <BOverlay
      :show="loading"
      class="w-100"
    >
      <p>{{ $t('settings.close_account_dialog_message') }}</p>
      <div class="mb-3">
        <label
          for="close-account-confirm"
          class="form-label"
        >
          {{ $t('settings.close_account_confirm_label') }}
        </label>
        <input
          id="close-account-confirm"
          v-model="confirmInput"
          type="text"
          class="form-control"
          autocomplete="off"
          :placeholder="userEmail ?? ''"
          @keydown.enter.prevent="isConfirmed && $emit('confirm')"
        />
      </div>
    </BOverlay>
  </BModal>
</template>
