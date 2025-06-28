<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { onMounted, ref, watch } from 'vue'
import type { SpeechRecognition, SpeechRecognitionEvent } from '@/types/speechrecognition'
import { useI18nStore } from '@/store/i18nStore'

import IconMic2 from '@/assets/icons/interface/mic-2.svg'
import IconGlobe from '@/assets/icons/interface/globe.svg'
// i18n
const { t } = useI18n()

const i18nStore = useI18nStore()

const model = defineModel<Record<string, string> | null>({
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
const currentLanguage = ref(i18nStore.getLanguage() || 'en')

let recognition: SpeechRecognition | null = null

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition =
    (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
  recognition = new SpeechRecognition()
  recognition.lang = 'en-US'
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
    if(!model.value) return
    const result = event.results[0][0]
    lastTranscript.value = result.transcript
    lastConfidence.value = result.confidence
    model.value[currentLanguage.value] += (model.value ? ' ' : '') + result.transcript
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
</script>

<template>
  <div class="d-flex flex-column">
    <div class="d-flex justify-content-end align-items-center mb-3">
      <ul class="nav nav-pills">
        <li class="nav-item me-2" v-for="lang in props.languages" :key="lang">
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
        <li class="nav-item"  style="width: 1rem; height: 1rem">
          <IconGlobe class="svg-icon svg-icon-100 me-2" />
        </li>
      </ul>
    </div>
    <div class="" v-for="lang in props.languages" :key="lang">
      <div v-if="currentLanguage === lang">
        <BFormFloatingLabel :label="props.placeholder" label-for="publicName" v-if="model">
          <BFormTextarea
            v-model="model[lang]"
            id="content-input"
            rows="5"
            no-resize
            size="lg"
            :required="true"
            class="mb-3"
          />
        </BFormFloatingLabel>
      </div>
    </div>
    <div class="align-self-end">
      <BButton variant="secondary" class="btn-icon" size="sm" @click="toggleListening">
        <IconMic2 class="svg-icon" />
        <i class="fas fa-microphone"></i>
        <!-- {{ isListening ? t('profiles.forms.dictate_listening') : t('profiles.forms.dictate') }} -->
      </BButton>
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

    <div v-if="recognition">
      <p><strong>isListening:</strong> {{ isListening }}</p>
      <p><strong>lastTranscript:</strong> {{ lastTranscript }}</p>
      <p><strong>lastConfidence:</strong> {{ lastConfidence }}</p>
      <p><strong>error:</strong> {{ error }}</p>
      <p><strong>lang:</strong> {{ recognition?.lang }}</p>
      <p><strong>interimResults:</strong> {{ recognition?.interimResults }}</p>
      <p><strong>continuous:</strong> {{ recognition?.continuous }}</p>
    </div>
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
