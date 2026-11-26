<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import PushPermissions from './PushPermissions.vue'
import type { ProfileOptInSettings, UpdateProfileOptInPayload } from '@zod/profile/profile.dto'
import { EMAIL_SCOPES, EMAIL_SCOPE_DEFAULTS, type EmailScope } from '@zod/user/emailPreference.dto'

defineProps<{
  disabled?: boolean
}>()

const { t } = useI18n()

const ownerProfileStore = useOwnerProfileStore()
const model = defineModel<ProfileOptInSettings>({
  default: () => ({
    isCallable: true,
    isPushNotificationEnabled: false,
    emailPreferences: { ...EMAIL_SCOPE_DEFAULTS },
  }),
})

// Notifications sit with push under the "when someone messages me" heading;
// every other scope gets its own checkbox, labelled settings.<scope>_opt_in.
const standaloneScopes = EMAIL_SCOPES.filter((scope) => scope !== 'notifications')

function emailPatch(scope: EmailScope, event: Event): UpdateProfileOptInPayload {
  return { emailPreferences: { [scope]: (event.target as HTMLInputElement).checked } }
}

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
          :checked="model.emailPreferences.notifications"
          :disabled="disabled || isSaving"
          @change="(e) => handleOptInChange(e, emailPatch('notifications', e))"
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

  <fieldset
    v-for="scope in standaloneScopes"
    :key="scope"
    class="mb-2"
  >
    <div class="form-check">
      <input
        :id="`${scope}-opt-in`"
        type="checkbox"
        class="form-check-input"
        :checked="model.emailPreferences[scope]"
        :disabled="disabled || isSaving"
        @change="(e) => handleOptInChange(e, emailPatch(scope, e))"
      />
      <label
        class="form-check-label"
        :for="`${scope}-opt-in`"
      >
        {{ t(`settings.${scope}_opt_in`) }}
      </label>
      <div class="form-hint">{{ t(`settings.${scope}_opt_in_hint`) }}</div>
    </div>
  </fieldset>

  <!--
    Video call settings temporarily hidden to fix the settings dialog layout on
    mobile screens. Re-enable once the dialog layout is properly fixed.

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
  -->
</template>
