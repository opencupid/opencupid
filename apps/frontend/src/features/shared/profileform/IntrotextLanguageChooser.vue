<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import IconQuestion from '@/assets/icons/interface/question.svg'
import LanguageIcon from '@/features/shared/profiledisplay/LanguageIcon.vue'

const { t } = useI18n()

defineProps<{
  langList: { value: string; label: string }[]
}>()

const currentLanguage = defineModel<string>({ required: true })
</script>

<template>
  <div class="d-flex justify-content-start align-items-center mb-3">
    <ul class="nav nav-pills flex-grow-1">
      <li
        class="nav-item me-2"
        v-for="lang in langList"
        :key="lang.value"
      >
        <a
          class="nav-link nav-link-sm"
          :class="{ active: currentLanguage === lang.value }"
          :aria-label="lang.label"
          :aria-selected="currentLanguage === lang.value"
          aria-current="page"
          href="#"
          @click="currentLanguage = lang.value"
        >
          <span class="d-flex align-items-center gap-2 py-1">
            <LanguageIcon
              :countryCode="lang.value"
              :size="16"
            />
            <small class="fs-xs d-none d-md-inline">{{ lang.label }}</small>
          </span>
        </a>
      </li>
    </ul>
    <BPopover
      placement="top"
      hover
      title-class="d-none"
    >
      <template #target>
        <button type="button" class="btn btn-info btn-sm btn-icon">
          <IconQuestion class="svg-icon-sm" />
        </button>
      </template>
      {{ t('profiles.forms.introtext_multilang_hint') }}
    </BPopover>
  </div>
</template>

<style scoped lang="scss">
.nav-link {
  padding: 0.15rem 0.6rem;
  font-size: 0.75rem;
}
</style>
