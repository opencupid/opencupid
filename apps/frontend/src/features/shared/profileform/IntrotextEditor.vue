<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { computed, ref, watch } from 'vue'
import type { SpeechRecognition, SpeechRecognitionEvent } from '@/types/speechrecognition'

import IconMic2 from '@/assets/icons/interface/mic-2.svg'
import IconQuestion from '@/assets/icons/interface/question.svg'
import { sortLanguagesWithEnFirst } from '@/lib/i18n'
import { useLanguages } from '@/features/shared/composables/useLanguages'
import LanguageIcon from '@/features/shared/profiledisplay/LanguageIcon.vue'
// i18n
const { t } = useI18n()
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

const debug = ref('')

const isListening = ref(false)
const lastTranscript = ref('')
const lastConfidence = ref(0)
const error = ref('')
const status = ref('idle')

const langList = computed(() => (props.languages ? sortLanguagesWithEnFirst(props.languages) : []))
const labelledLangList = computed(() => getLanguageLabels(langList.value))

// TODO: replace with a computed or composable — the ref + watcher is a workaround
// for langList being empty at setup time (formData arrives async from the store).
const currentLanguage = ref(langList.value[0] ?? '')

// Sync currentLanguage when langList populates after initial mount
watch(langList, (langs) => {
  if (!currentLanguage.value || !langs.includes(currentLanguage.value)) {
    currentLanguage.value = langs[0] ?? ''
  }
})

let recognition: SpeechRecognition | null = null

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition =
    (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
  recognition = new SpeechRecognition()
  recognition.lang = currentLanguage.value
  recognition.continuous = false
  recognition.interimResults = false

  recognition.onstart = () => {
    status.value = 'started'
    isListening.value = true
  }

  recognition.onend = () => {
    status.value = 'ended'
    isListening.value = false
  }

  recognition.onerror = (e: any) => {
    error.value = e.error
    status.value = 'error'
    isListening.value = false
  }

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    if (!model.value) return
    const result = event.results[0]?.[0]
    if (!result) return
    lastTranscript.value = result.transcript
    lastConfidence.value = result.confidence
    const current = model.value[currentLanguage.value] || ''
    model.value[currentLanguage.value] = (current ? current + ' ' : '') + result.transcript
    status.value = 'result'
  }

  recognition.onspeechend = () => {
    status.value = 'speechend'
    recognition?.stop()
  }

  recognition.onaudioend = () => {
    status.value = 'audioend'
  }

  recognition.onnomatch = () => {
    status.value = 'no match'
  }
}

const toggleListening = () => {
  if (!recognition) {
    status.value = 'SpeechRecognition not supported'
    return
  }

  if (isListening.value) {
    recognition.stop()
    status.value = 'manually stopped'
  } else {
    try {
      recognition.lang = currentLanguage.value
      recognition.start()
      status.value = 'starting...'
    } catch (e: any) {
      error.value = e.message
      status.value = 'start failed'
    }
  }
}

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

watch(
  () => currentLanguage.value,
  (lang) => {
    if (recognition) {
      recognition.lang = lang
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="d-flex flex-column">
    <div
      v-if="langList.length > 1"
      class="d-flex justify-content-start align-items-center mb-3"
    >
      <ul class="nav nav-pills flex-grow-1">
        <li
          class="nav-item me-2"
          v-for="lang in labelledLangList"
          :key="lang.value"
        >
          <a
            class="nav-link nav-link-sm"
            :class="{ active: currentLanguage === lang.value }"
            :aria-label="lang.label"
            :aria-selected="currentLanguage === lang.value"
            aria-current="page"
            href="#"
            @click.prevent="currentLanguage = lang.value"
          >
            <span class="d-flex align-items-center gap-2">
              <LanguageIcon
                :countryCode="lang.value"
                :size="16"
              />
              <small class="fs-xs">{{ lang.label }}</small>
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
          <button
            type="button"
            class="btn btn-info btn-sm btn-icon"
            :aria-label="t('profiles.forms.introtext_multilang_hint')"
          >
            <IconQuestion class="svg-icon-sm" />
          </button>
        </template>
        {{ t('profiles.forms.introtext_multilang_hint') }}
      </BPopover>
    </div>
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
