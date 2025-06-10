<script setup lang="ts">
import { onMounted, reactive, toRefs } from 'vue'
import { useProfileStore } from '@/store/profileStore'

import type { OwnerProfile, ProfileFormSubmit, UpdateProfilePayload } from '@zod/profile.schema'
import { OwnerProfileSchema, UpdatedProfileFragmentSchema } from '@zod/profile.schema'
import { type ConnectionTypeType } from '@zod/generated'
import { useI18n } from 'vue-i18n'

import ConnectionTypeSelector from '@/components/ConnectionTypeSelector.vue'
import ProfileForm from '@/components/profiles/ProfileForm.vue'
import ErrorComponent from '@/components/ErrorComponent.vue'
import DatingProfileForm from '@/components/profiles/DatingProfileForm.vue'

const profileStore = useProfileStore()
const { t } = useI18n()

const state = reactive({
  activeTab: 'friend' as ConnectionTypeType,
  isLoading: false,
  error: '',
})

const { activeTab, isLoading, error } = toRefs(state)

const profile = reactive<OwnerProfile>({} as OwnerProfile)

/**
 * Save the profile back to the store.
 * Mutates `state` directly and never uses `.value`.
 */
async function handleProfileFormSubmit(formData: ProfileFormSubmit) {
  state.isLoading = true
  state.error = ''

  // map Tag[] to tagId[]
  let tags: string[] = []
  if (formData.tags && formData.tags.length > 0) tags = formData.tags.map((tag) => tag.id)

  const payload: UpdateProfilePayload = {
    ...formData,
    tags: tags,
  }

  try {
    console.log('onboarding Saving profile', payload)
    const updated = await profileStore.updateProfile(payload)
    if (updated) {
      Object.assign(profile, updated)
      state.error = ''
    } else {
      state.error = t('profile.update_failed')
    }
  } catch (err: any) {
    state.error = err.message || 'An error occurred while updating the profile.'
  } finally {
    state.isLoading = false
  }
}

onMounted(async () => {
  state.isLoading = true
  const fetched = await profileStore.getUserProfile()
  Object.assign(profile, {
    ...fetched,
    isActive: true,
  })
  state.isLoading = false
})
</script>

<template>
  <div class="container mb-5 mt-3">
    <div class="row justify-content-center">
      <ConnectionTypeSelector
        :isDatingActive="!!profile.isDatingActive"
        :activeTab="activeTab"
        @update:selectTab="activeTab = $event"
        @update:isDatingActive="(val: boolean) => (profile.isDatingActive = val)"
      />

      <div class="tab-content p-3 border border-top-0">
        <div v-if="activeTab === 'dating'" class="tab-pane active">
          <div class="mt-2">
            <DatingProfileForm
              :isLoading="isLoading"
              :modelValue="profile"
              @update:modelValue="(val) => Object.assign(profile, val)"
              @update:isDatingActive="(val: boolean) => (profile.isDatingActive = val)"
              @submit="handleProfileFormSubmit"
            />
          </div>
        </div>
        <div v-if="activeTab === 'friend'" class="tab-pane active">
          <div class="mt-4">
            <ProfileForm
              :isLoading="isLoading"
              :modelValue="profile"
              @update:modelValue="(val) => Object.assign(profile, val)"
              @submit="handleProfileFormSubmit"
            />
          </div>
        </div>
      </div>
    </div>
    <ErrorComponent :error="state.error" />
  </div>
</template>
