<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import PushPermissions from './PushPermissions.vue'
import type { ProfileOptInSettings } from '@zod/profile/profile.dto'

defineProps<{
  disabled?: boolean
}>()

const { t } = useI18n()
const ownerProfileStore = useOwnerProfileStore()

const isSaving = ref(false)
const optIn = reactive({} as ProfileOptInSettings)

onMounted(async () => {
  const res = await ownerProfileStore.fetchOptInSettings()
  if (res.success && res.data) {
    Object.assign(optIn, res.data)
  }
})

async function handleCallableChange(event: Event) {
  const checkbox = event.target as HTMLInputElement
  const newValue = checkbox.checked

  isSaving.value = true
  try {
    const res = await ownerProfileStore.updateOptInSettings({ isCallable: newValue })
    if (!res.success) {
      checkbox.checked = !newValue
    } else if (res.data) {
      Object.assign(optIn, res.data)
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
        Object.assign(optIn, res.data)
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
</script>

<template>
  <fieldset class="mb-3">
    <PushPermissions
      v-model="optIn.isPushNotificationEnabled"
      :disabled="disabled || isSaving"
    />
  </fieldset>

  <fieldset class="mb-3">
    <div class="form-check">
      <input
        id="callable-opt-in"
        type="checkbox"
        class="form-check-input"
        :checked="ownerProfileStore.profile?.isCallable ?? true"
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
        :checked="optIn.newsletterOptIn"
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
