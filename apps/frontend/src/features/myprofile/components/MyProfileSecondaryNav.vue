<script setup lang="ts">
import { computed, inject, type Ref, ref } from 'vue'
import { useI18nStore } from '@/store/i18nStore'

import { type ViewState } from '../composables/types'
import ScopeViewToggler from '@/features/shared/ui/ScopeViewToggler.vue'
import LanguageIcon from '@/features/shared/profiledisplay/LanguageIcon.vue'
import IconSetting2 from '@/assets/icons/interface/setting-2.svg'
import IconViewAs from '@/assets/icons/interface/unhide.svg'
import IconHeart from '@/assets/icons/interface/heart.svg'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import IconGlobe from '@/assets/icons/interface/globe.svg'
import { faSliders } from '@fortawesome/free-solid-svg-icons'

import { type OwnerProfile } from '@zod/profile/profile.dto'

const model = defineModel<ViewState>({
  default: {
    scopes: [],
    currentScope: 'dating',
  },
  required: true,
})

const isDatingActive = defineModel<boolean>('isDatingActive', {
  default: false,
})

const emit = defineEmits<{
  (e: 'datingmode:toggle'): void
  (e: 'datingmode:prefs'): void
}>()

const viewerProfile = inject<Ref<OwnerProfile>>('viewerProfile')

const i18nStore = useI18nStore()

const languagePreviewOptions = computed(() => {
  return i18nStore.getLanguageLabels(viewerProfile?.value.languages || [])
})

const hasPreviewLanguages = computed(() => languagePreviewOptions.value.length > 1)
</script>

<template>
  <div class="d-flex justify-content-end align-items-center w-100">
    <BNav>
      <!-- View as -->
      <BNavItemDropdown :auto-close="'outside'" v-if="isDatingActive || hasPreviewLanguages">
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

          <!-- preview language -->
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

      <!-- Preferences -->
      <!-- TODO extract into separate component -->
      <BNavItemDropdown
        class="btn-link-secondary"
        toggle-class="btn-link-warning"
        :auto-close="'outside'"
      >
        <template #button-content>
          <span :class="{ 'text-dating': isDatingActive, 'text-secondary': !isDatingActive }">
            <IconHeart class="svg-icon-lg" />
          </span>
        </template>

        <BDropdownItemButton
          style="min-width: 15rem"
          @click.stop="$emit('datingmode:toggle')"
        >
          <span class="d-flex align-items-center justify-content-start">
            <BFormCheckbox
              switch
              :model-value="isDatingActive"
              tabindex="-1"
              style="pointer-events: none"
            />
            <span>{{ $t('profiles.forms.dating_mode') }}</span>
          </span>
        </BDropdownItemButton>

        <BDropdownDivider v-if="isDatingActive" />
        <BDropdownItemButton
          v-if="isDatingActive"
          @click="$emit('datingmode:prefs')"
        >
          <FontAwesomeIcon :icon="faSliders" />
          {{ $t('profiles.forms.my_preferences') }}
        </BDropdownItemButton>
      </BNavItemDropdown>

      <!-- Settings -->
      <BNavItem
        to="/settings"
        link-class="text-secondary"
      >
        <IconSetting2 class="svg-icon-lg" />
      </BNavItem>
    </BNav>
  </div>
</template>

<style scoped>
/* hide dropdown caret */
:deep(button:after) {
  content: none !important;
  display: none !important;
  margin: 0 !important;
  padding: 0 !important;
}

.language-option .flag-icon {
  opacity: 0.5;
}
.language-option :deep(button.active) .flag-icon {
  opacity: 1 !important;
}
</style>
