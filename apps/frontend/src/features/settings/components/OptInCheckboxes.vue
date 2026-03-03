<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import PushPermissions from './PushPermissions.vue'
import type { ProfileOptInSettings } from '@zod/profile/profile.dto'

defineProps<{
  disabled?: boolean
}>()

const { t } = useI18n()


const ownerProfileStore = useOwnerProfileStore()
const model = defineModel<ProfileOptInSettings>({
  default: () => ({
    isCallable: true,
    newsletterOptIn: false,
    isPushNotificationEnabled: false,
  }),
})

const isSaving = ref(false)

async function handleCallableChange(event: Event) {
  const checkbox = event.target as HTMLInputElement
  const newValue = checkbox.checked

  isSaving.value = true
  try {
    const res = await ownerProfileStore.updateOptInSettings({ isCallable: newValue })
    if (!res.success) {
      checkbox.checked = !newValue
    } else if (res.data) {
      model.value = res.data
    }
  } catch {
    checkbox.checked = !newValue
  } finally {
    isSaving.value = false
  }
}

async function handleNewsletterOptInChange(event: Event) {
  const checkbox = event.target as HTMLInputElement
  const newValue = checkbox.checked

  isSaving.value = true
  try {
    const res = await ownerProfileStore.updateOptInSettings({ newsletterOptIn: newValue })
    if (res.success) {
      if (res.data) {
        model.value = res.data
      }
    } else {
      checkbox.checked = !newValue
      console.error('Failed to update newsletter preference:', res.message)
    }
  } catch (error) {
    checkbox.checked = !newValue
    console.error('Failed to update newsletter preference:', error)
  } finally {
    isSaving.value = false
  }
}

function handlePushChange(value: boolean) {
  model.value = {
    ...model.value,
    isPushNotificationEnabled: value,
  }
}
</script>

<template>
  <fieldset class="mb-3">
    <PushPermissions
      :model-value="model.isPushNotificationEnabled"
      :disabled="disabled || isSaving"
      @update:modelValue="handlePushChange"
    />
  </fieldset>

  <fieldset class="mb-3">
    <div class="form-check">
      <input
        id="callable-opt-in"
        type="checkbox"
        class="form-check-input"
        :checked="model.isCallable"
        :disabled="disabled || isSaving"
        @change="handleCallableChange"
      />
      <label
        class="form-check-label"
        for="callable-opt-in"
      >
        {{ t('calls.open_to_calls_setting') }}
      </label>
    </div>
  </fieldset>

  <fieldset class="mb-3">
    <div class="form-check">
      <input
        id="newsletter-opt-in"
        type="checkbox"
        class="form-check-input"
        :checked="model.newsletterOptIn"
        :disabled="disabled || isSaving"
        @change="handleNewsletterOptInChange"
      />
      <label
        class="form-check-label"
        for="newsletter-opt-in"
      >
        {{ t('settings.newsletter_opt_in') }}
      </label>
    </div>
  </fieldset>
</template>
