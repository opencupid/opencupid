<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { computed, ref, watch } from 'vue'

import { sortLanguagesWithDefaultFirst } from '@/lib/i18n'
import { useLanguages } from '@/features/shared/composables/useLanguages'
import IntrotextLanguageChooser from './IntrotextLanguageChooser.vue'
const { locale } = useI18n()
const { getLanguageLabels } = useLanguages()

type Language = string
type LocalizedText = Record<Language, string>

const model = defineModel<LocalizedText | null>({
  default: () => ({}),
})

const props = withDefaults(
  defineProps<{
    languages?: string[]
    placeholder: string
  }>(),
  { languages: () => [] }
)

const langList = computed(() => (props.languages ? sortLanguagesWithDefaultFirst(props.languages, locale.value) : []))
const labelledLangList = computed(() => getLanguageLabels(langList.value))

const selectedLanguage = ref('')

const currentLanguage = computed({
  get: () => {
    if (langList.value.includes(selectedLanguage.value)) return selectedLanguage.value
    return langList.value[0] ?? ''
  },
  set: (lang: string) => {
    selectedLanguage.value = lang
  },
})

watch(
  () => model.value,
  (value) => {
    if (!value || !props.languages) return

    props.languages.forEach((lang) => {
      if (!(lang in value)) {
        value[lang] = ''
      }
    })
  },
  { immediate: true }
)
</script>

<template>
  <div class="d-flex flex-column">
    <IntrotextLanguageChooser
      v-if="langList.length > 1"
      v-model="currentLanguage"
      :langList="labelledLangList"
    />
    <div
      v-for="lang in props.languages"
      :key="lang"
    >
      <div v-if="currentLanguage === lang">
        <BFormFloatingLabel
          :label="props.placeholder"
          label-for="publicName"
          v-if="model"
        >
          <BFormTextarea
            v-model="model[lang]"
            id="content-input"
            rows="3"
            no-resize
            size="lg"
            :required="true"
          />
        </BFormFloatingLabel>
      </div>
    </div>

    <!-- <BFormFloatingLabel label="My name is..." label-for="publicName">
      <BFormTextarea
        v-model="model"
        id="content-input"
        :placeholder="$t('profiles.introtext_placeholder')"
        :label="$t('profiles.introtext_label')"
        max-rows="5"
        no-resize
        size="lg"
        :required="true"
        class="mb-3"
      />
    </BFormFloatingLabel> -->
    <!-- 
    <div v-if="recognition">
      <p><strong>isListening:</strong> {{ isListening }}</p>
      <p><strong>lastTranscript:</strong> {{ lastTranscript }}</p>
      <p><strong>lastConfidence:</strong> {{ lastConfidence }}</p>
      <p><strong>error:</strong> {{ error }}</p>
      <p><strong>lang:</strong> {{ recognition?.lang }}</p>
      <p><strong>interimResults:</strong> {{ recognition?.interimResults }}</p>
      <p><strong>continuous:</strong> {{ recognition?.continuous }}</p>
    </div> -->
  </div>
</template>

<style scoped lang="scss">
.nav-link {
  padding: 0.15rem 0.6rem;
  font-size: 0.75rem;
}
textarea {
  height: 30vh !important;
}
</style>
