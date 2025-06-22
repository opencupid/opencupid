<script setup lang="ts">
import { type DatingPreferencesDTO } from '@zod/match/datingPreference.dto'
import { ref } from 'vue'
import { type OwnerProfile } from '@zod/profile/profile.dto'

import IconSetting from '@/assets/icons/interface/setting.svg'
import ScopeViewToggler from '../ScopeViewToggler.vue'
import DatingPreferencesForm from './DatingPreferencesForm.vue'

const model = defineModel<DatingPreferencesDTO>()

const props = defineProps<{
  profile: OwnerProfile
}>()

defineEmits({
  'update:datingPrefs': () => true,
})

const showModal = ref(false)

const handlePrefsClick = () => {
  showModal.value = true
}

const viewState = ref('social')
</script>

<template>
  <div class="d-flex justify-content-end align-items-center w-100">
    <ScopeViewToggler v-model="viewState">
      <template #items-left>
        <!-- <BButton
          variant="primary"
          class="me-2"
          @click="$emit('update:datingPrefs')"
        >
          <IconRefresh class="svg-icon" />
        </BButton> -->
      </template>
      <template #items-right>
        <BButton variant="primary" class="ms-2" @click="handlePrefsClick">
          <IconSetting class="svg-icon" />
        </BButton>
      </template>
    </ScopeViewToggler>

    <BModal
      v-model="showModal"
      centered
      button-size="sm"
      :focus="false"
      :no-close-on-backdrop="true"
      fullscreen="sm"
      :no-footer="false"
      :no-header="true"
      cancel-title="Nevermind"
      initial-animation
      :body-scrolling="false"
      title="Add a photo"
      @ok="$emit('update:datingPrefs')"
    >
      <DatingPreferencesForm v-model="model" :profile />
    </BModal>
  </div>
</template>
