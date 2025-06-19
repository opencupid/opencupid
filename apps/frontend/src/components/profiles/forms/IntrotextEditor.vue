<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import type { SpeechRecognition, SpeechRecognitionEvent } from '@/types/speechrecognition'
import IconMic2 from '@/assets/icons/interface/mic-2.svg'
import IconGlobe from '@/assets/icons/interface/globe.svg'
// i18n
const { t } = useI18n()

const model = defineModel<string | null>({
  default: () => '',
})

const props = defineProps<{
  languages: string[],
  placeholder: string,
}>()

const debug = ref('')

const isListening = ref(false)
const lastTranscript = ref('')
const lastConfidence = ref(0)
const error = ref('')
const status = ref('idle')
const currentLanguage = ref(props.languages[0] || 'en')

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
    const result = event.results[0][0]
    lastTranscript.value = result.transcript
    lastConfidence.value = result.confidence
    model.value += (model.value ? ' ' : '') + result.transcript
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
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <IconGlobe class="svg-icon me-2" />
      </div>
      <ul class="nav nav-underline flex-grow-1">
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
      </ul>
      <div class="">
        <BButton variant="secondary" size="sm" pill @click="toggleListening">
          <IconMic2 class="svg-icon" />
          <i class="fas fa-microphone"></i>
          {{ isListening ? t('profiles.forms.dictate_listening') : t('profiles.forms.dictate') }}
        </BButton>
      </div>
    </div>
    <BFormFloatingLabel :label="props.placeholder" label-for="publicName">
      <BFormTextarea
        v-model="model"
        id="content-input"
        :placeholder="t('profiles.forms.intro_placeholder')"
        max-rows="5"
        min-rows="3"
        no-resize
        size="lg"
        :required="true"
        class="mb-3"
      />
    </BFormFloatingLabel>

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
  padding: 0.15rem 1rem ;
}
</style>