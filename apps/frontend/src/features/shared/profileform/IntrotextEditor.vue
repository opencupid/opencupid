<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { computed, ref, watch } from 'vue'
import type { SpeechRecognition, SpeechRecognitionEvent } from '@/types/speechrecognition'

import IconMic2 from '@/assets/icons/interface/mic-2.svg'
import IconGlobe from '@/assets/icons/interface/globe.svg'
import { sortLanguagesWithEnFirst } from '@/lib/i18n'
// i18n
const { t } = useI18n()

type Language = string
type LocalizedText = Record<Language, string>

const model = defineModel<LocalizedText | null>({
  default: () => ({}),
})

const props = defineProps<{
  languages: string[]
  placeholder: string
}>()

const debug = ref('')

const isListening = ref(false)
const lastTranscript = ref('')
const lastConfidence = ref(0)
const error = ref('')
const status = ref('idle')

const langList = computed(() => sortLanguagesWithEnFirst(props.languages))

const currentLanguage = ref(langList.value[0])

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
    const result = event.results[0][0]
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
  value => {
    if (!value) return

    props.languages.forEach(lang => {
      if (!(lang in value)) {
        value[lang] = ''
      }
    })
  },
  { immediate: true }
)

watch(
  () => currentLanguage.value,
  lang => {
    if (recognition) {
      recognition.lang = lang
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="d-flex flex-column">
    <div class="d-flex justify-content-start align-items-center mb-3">
      <ul class="nav nav-pills flex-grow-1">
        <li class="nav-item me-2" style="width: 1rem; height: 1rem">
          <IconGlobe class="svg-icon svg-icon-100" />
        </li>
        <li class="nav-item me-2" v-for="lang in langList" :key="lang">
          <a
            class="nav-link"
            :class="{ active: currentLanguage === lang }"
            :aria-label="lang"
            :aria-selected="currentLanguage === lang"
            aria-current="page"
            href="#"
            @click="currentLanguage = lang"
            ><small>{{ lang }}</small></a
          >
        </li>
      </ul>
      <div class="align-self-end">
        <BButton
          :variant="isListening ? 'danger' : 'secondary'"
          class="btn-icon"
          size="sm"
          @click="toggleListening"
          :title="isListening ? t('profiles.forms.dictate_listening') : t('profiles.forms.dictate')"
        >
          <IconMic2 class="svg-icon" />
        </BButton>
      </div>
    </div>
    <div v-for="lang in props.languages" :key="lang">
      <div v-if="currentLanguage === lang">
        <BFormFloatingLabel :label="props.placeholder" label-for="publicName" v-if="model">
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
  padding: 0.15rem 1rem;
}
textarea {
  height: 30vh !important;
}
.svg-icon-100 {
  width: 100%;
  height: 100%;
}
</style>
