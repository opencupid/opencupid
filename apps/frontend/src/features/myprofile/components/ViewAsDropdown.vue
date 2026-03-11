<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import { useLanguages } from '@/features/shared/composables/useLanguages'

import { type ViewState } from '../composables/types'
import ScopeViewToggler from '@/features/shared/ui/ScopeViewToggler.vue'
import LanguageIcon from '@/features/shared/profiledisplay/LanguageIcon.vue'
import IconViewAs from '@/assets/icons/interface/unhide.svg'
import IconGlobe from '@/assets/icons/interface/globe.svg'

import { type OwnerProfile } from '@zod/profile/profile.dto'

const model = defineModel<ViewState>({ required: true })

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
  <BNavItemDropdown
    :auto-close="'outside'"
    v-if="isDatingActive || hasPreviewLanguages"
  >
    <template #button-content>
      <span class="text-secondary">
        <IconViewAs class="svg-icon-lg" />
      </span>
    </template>

    <span v-if="isDatingActive">
      <BDropdownItem>
        <ScopeViewToggler v-model="model.currentScope" />
      </BDropdownItem>

      <BDropdownDivider />
    </span>

    <span v-if="hasPreviewLanguages">
      <BDropdownText style="width: 12rem">
        <IconGlobe class="svg-icon" />
        {{ $t('profiles.forms.preview_language') }}
      </BDropdownText>

      <BDropdownItemButton
        v-for="lang in languagePreviewOptions"
        :key="lang.value"
        class="language-option"
        :active="lang.value === model.previewLanguage"
        @click="model.previewLanguage = lang.value"
      >
        <span class="d-flex align-items-center">
          <span class="flex-grow-1">{{ lang.label }}</span>
          <LanguageIcon
            :countryCode="lang.value"
            :size="24"
          />
        </span>
      </BDropdownItemButton>
    </span>
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
