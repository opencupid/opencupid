<script setup lang="ts">
import { ref } from 'vue'

import { useMyProfileViewModel } from '../composables/useMyProfileViewModel'
import DatingPreferencesForm from '@/features/browse/components/DatingPreferencesForm.vue'
import EditDatingProfile from '../components/EditDatingProfile.vue'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { formData, datingPrefs, isLoading, updateProfile, persistDatingPrefs } =
  useMyProfileViewModel(false)

const isSaving = ref(false)

async function handleSave() {
  isSaving.value = true
  await Promise.all([updateProfile(), persistDatingPrefs()])
  emit('close')
}
</script>

<template>
  <div class="d-flex flex-column h-100">
    <section class="p-2 w-100 flex-grow-1 overflow-auto hide-scrollbar py-3">
      <BTabs
        variant="warning"
        nav-class="justify-content-center"
      >
        <BTab
          :title="$t('profiles.forms.dating_profile_tab')"
          active
        >
          <fieldset
            class="pt-3"
            :disabled="isSaving || isLoading"
          >
            <EditDatingProfile
              v-model="formData"
              @save="handleSave"
            />
          </fieldset>
        </BTab>
        <BTab :title="$t('profiles.forms.my_preferences')">
          <fieldset
            class="pt-3"
            :disabled="isSaving || isLoading"
          >
            <DatingPreferencesForm
              v-if="datingPrefs"
              v-model="datingPrefs"
            />
          </fieldset>
        </BTab>
      </BTabs>
    </section>
    <div class="flex-shrink-0 shadow shadow-lg bg-light-subtle py-3 d-flex justify-content-center gap-2">
      <BButton
        variant="link"
        class="link-secondary"
        @click="emit('close')"
      >
        {{ $t('onboarding.wizard.cancel') }}
      </BButton>
      <BButton
        variant="primary"
        pill
        class="px-5"
        @click.stop="handleSave"
        :disabled="isLoading"
      >
        {{ $t('onboarding.wizard.finish') }}
      </BButton>
    </div>
  </div>
</template>
