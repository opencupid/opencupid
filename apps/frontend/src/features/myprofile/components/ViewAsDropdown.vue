<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import { useLanguages } from '@/features/shared/composables/useLanguages'

import { type ViewState } from '../composables/types'
import LanguageIcon from '@/features/shared/profiledisplay/LanguageIcon.vue'
import IconViewAs from '@/assets/icons/interface/unhide.svg'
import IconGlobe from '@/assets/icons/interface/globe.svg'
import IconMenuDotsVert from '@/assets/icons/interface/menu-dots-vert.svg'

import { type OwnerProfile } from '@zod/profile/profile.dto'

const viewState = defineModel<ViewState>({ required: true })

const viewerProfile = inject<Ref<OwnerProfile | null>>('viewerProfile')

const isDatingActive = defineModel<boolean>('isDatingActive', {
  default: false, // default this to isOnboarded
})

const { getLanguageLabels } = useLanguages()

const languagePreviewOptions = computed(() => {
  return getLanguageLabels(viewerProfile?.value?.languages ?? [])
})

const hasPreviewLanguages = computed(() => languagePreviewOptions.value.length > 1)

const toggleScope = (hide: () => void) => {
  viewState.value.currentScope = viewState.value.currentScope === 'dating' ? 'social' : 'dating'
  setTimeout(hide, 1000)
}
</script>

<template>
  <BDropdown
    v-if="isDatingActive || hasPreviewLanguages"
    variant="link"
    no-caret
  >
    <template #button-content>
      <span
        class="text-secondary"
        :title="$t('profiles.forms.preview_profile')"
      >
        <IconMenuDotsVert class="svg-icon-lg" />
      </span>
    </template>
    <template #default="{ hide }">
      <div style="width: 16rem">
        <BDropdownText>
          <div>
            <IconViewAs class="svg-icon me-1" />
            {{ $t('profiles.forms.preview_profile_hint') }}
          </div>
        </BDropdownText>

        <span v-if="isDatingActive">
          <BDropdownDivider />
          <BDropdownItemButton @click.stop="toggleScope(hide)">
            <span class="d-flex align-items-center justify-content-start">
              <BFormCheckbox
                switch
                :model-value="viewState.currentScope === 'dating'"
                tabindex="-1"
                style="pointer-events: none"
              />
              <span>{{ $t('profiles.forms.dating_mode_view') }}</span>
            </span>
            <div class="form-hint lh-sm">
              <div v-if="viewState.currentScope === 'dating'">
                {{ $t('profiles.forms.dating_mode_view_hint_active') }}
              </div>
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
    </template>
  </BDropdown>
</template>

<style scoped>
.language-option .flag-icon {
  opacity: 0.5;
}
.language-option :deep(button.active) .flag-icon {
  opacity: 1 !important;
}
</style>
