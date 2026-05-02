<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import PushPermissions from './PushPermissions.vue'
import type { ProfileOptInSettings, UpdateProfileOptInPayload } from '@zod/profile/profile.dto'

defineProps<{
  disabled?: boolean
}>()

const { t } = useI18n()

const ownerProfileStore = useOwnerProfileStore()
const model = defineModel<ProfileOptInSettings>({
  default: () => ({
    isCallable: true,
    newsletterOptIn: false,
    emailNotificationsOptIn: true,
    isPushNotificationEnabled: false,
  }),
})

const isSaving = ref(false)

async function handleOptInChange(event: Event, patch: UpdateProfileOptInPayload) {
  const checkbox = event.target as HTMLInputElement
  const previous = !checkbox.checked

  isSaving.value = true
  try {
    const res = await ownerProfileStore.updateOptInSettings(patch)
    if (res.success) {
      if (res.data) model.value = res.data
    } else {
      checkbox.checked = previous
      console.error('Failed to update opt-in preference:', res.message)
    }
  } catch (error) {
    checkbox.checked = previous
    console.error('Failed to update opt-in preference:', error)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <fieldset>
    <div class="mb-1">{{ t('settings.notifications_opt_in') }}</div>

    <div class="ms-4">
      <PushPermissions :disabled="disabled || isSaving" />

      <div class="form-check">
        <input
          id="email-notifications-opt-in"
          type="checkbox"
          class="form-check-input"
          :checked="model.emailNotificationsOptIn"
          :disabled="disabled || isSaving"
          @change="
            (e) =>
              handleOptInChange(e, {
                emailNotificationsOptIn: (e.target as HTMLInputElement).checked,
              })
          "
        />
        <label
          class="form-check-label"
          for="email-notifications-opt-in"
        >
          {{ t('settings.email_notifications_opt_in') }}
        </label>
      </div>
    </div>
  </fieldset>

  <fieldset class="mb-2 mb-md-4">
    <div class="form-check">
      <input
        id="newsletter-opt-in"
        type="checkbox"
        class="form-check-input"
        :checked="model.newsletterOptIn"
        :disabled="disabled || isSaving"
        @change="
          (e) => handleOptInChange(e, { newsletterOptIn: (e.target as HTMLInputElement).checked })
        "
      />
      <label
        class="form-check-label"
        for="newsletter-opt-in"
      >
        {{ t('settings.newsletter_opt_in') }}
      </label>
      <div class="form-hint">{{ t('settings.newsletter_opt_in_hint') }}</div>
    </div>
  </fieldset>

  <fieldset class="mb-2 mb-md-">
    <legend class="h6">{{ t('calls.section_title') }}</legend>

    <div class="form-check">
      <input
        id="callable-opt-in"
        type="checkbox"
        class="form-check-input"
        :checked="model.isCallable"
        :disabled="disabled || isSaving"
        @change="
          (e) => handleOptInChange(e, { isCallable: (e.target as HTMLInputElement).checked })
        "
      />
      <label
        class="form-check-label"
        for="callable-opt-in"
      >
        {{ t('calls.open_to_calls_setting') }}
      </label>
      <div class="form-hint">{{ t('settings.calls_opt_in_hint') }}</div>
    </div>
  </fieldset>
</template>
