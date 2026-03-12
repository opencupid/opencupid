<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import { useLanguages } from '@/features/shared/composables/useLanguages'

import { type ViewState } from '../composables/types'
import LanguageIcon from '@/features/shared/profiledisplay/LanguageIcon.vue'
import IconViewAs from '@/assets/icons/interface/unhide.svg'
import IconGlobe from '@/assets/icons/interface/globe.svg'

import { type OwnerProfile } from '@zod/profile/profile.dto'

const viewState = defineModel<ViewState>({ required: true })

const isDatingActive = defineModel<boolean>('isDatingActive', {
  default: false,
})

const viewerProfile = inject<Ref<OwnerProfile>>('viewerProfile')

const { getLanguageLabels } = useLanguages()

const languagePreviewOptions = computed(() => {
  return getLanguageLabels(viewerProfile?.value.languages || [])
})

const hasPreviewLanguages = computed(() => languagePreviewOptions.value.length > 1)
</script>

<template>
  <BNavItemDropdown v-if="isDatingActive || hasPreviewLanguages">
    <template #button-content>
      <span class="text-secondary">
        <IconViewAs class="svg-icon-lg" />
      </span>
    </template>
    <div style="width: 16rem">
      <BDropdownText>
        <div class="">Preview your profile </div>
      </BDropdownText>

      <span v-if="isDatingActive">
        <BDropdownDivider />
        <BDropdownItemButton
          @click.stop="
            viewState.currentScope = viewState.currentScope === 'dating' ? 'social' : 'dating'
          "
        >
          <span class="d-flex align-items-center justify-content-start">
            <BFormCheckbox
              switch
              :model-value="viewState.currentScope === 'dating'"
              tabindex="-1"
              style="pointer-events: none"
            />
            <span> Dating mode view </span>
          </span>
          <div class="form-hint lh-sm">
            <div v-if="viewState.currentScope === 'dating'">
              This is what people also in dating mode will see when they view your profile.
            </div>
            <div v-else>This is what everyone else sees about you.</div>
          </div>
        </BDropdownItemButton>

      </span>

      <span v-if="hasPreviewLanguages">
        <BDropdownDivider />
        <BDropdownGroup :header="$t('profiles.forms.preview_language')">
        <BDropdownItemButton
          v-for="lang in languagePreviewOptions"
          :key="lang.value"
          class="language-option"
          :active="lang.value === viewState.previewLanguage"
          @click="viewState.previewLanguage = lang.value"
        >
          <span class="d-flex align-items-center">
            <span class="flex-grow-1">{{ lang.label }}</span>
            <LanguageIcon
              :countryCode="lang.value"
              :size="24"
            />
          </span>
        </BDropdownItemButton>
        </BDropdownGroup>
      </span>
    </div>
  </BNavItemDropdown>
</template>

<style scoped>
.language-option .flag-icon {
  opacity: 0.5;
}
.language-option :deep(button.active) .flag-icon {
  opacity: 1 !important;
}
</style>
