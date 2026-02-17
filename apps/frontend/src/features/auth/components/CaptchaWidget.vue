<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import 'altcha'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const challengeUrl = __APP_CONFIG__.API_BASE_URL + '/captcha/challenge'

const altchaWidget = ref<HTMLElement | null>(null)

const props = defineProps({
  payload: {
    type: String,
    required: false,
  },
})

const emit = defineEmits<{
  (e: 'update:payload', value: string): void
}>()
const internalValue = ref(props.payload)

const challengeurl = computed(() => {
  return challengeUrl
})

watch(internalValue, (v) => {
  emit('update:payload', v || '')
})

const onStateChange = (ev: CustomEvent | Event) => {
  if ('detail' in ev) {
    const { payload, state } = ev.detail
    if (state === 'verified' && payload) {
      internalValue.value = payload
    } else {
      internalValue.value = ''
    }
  }
}

onMounted(() => {
  if (altchaWidget.value) {
    altchaWidget.value.addEventListener('statechange', onStateChange)
  }
})

onUnmounted(() => {
  if (altchaWidget.value) {
    altchaWidget.value.removeEventListener('statechange', onStateChange)
  }
})
</script>

<template>
  <!-- https://github.com/altcha-org/altcha#configuration -->
  <altcha-widget
    ref="altchaWidget"
    style="--altcha-max-width: 100%"
    :challengeurl="challengeurl"
    disableautofocus
    hidefooter
    hidelogo
    :strings="
      JSON.stringify({
        label: t('auth.captcha_input_label'),
        verify: t('auth.captcha_verify'),
        verifying: t('auth.captcha_verifying'),
        verified: t('auth.captcha_success'),
        reload: t('auth.captcha_refresh'),
        error: t('auth.captcha_error'),
      })
    "
  ></altcha-widget>
</template>

<style scoped>
:deep(.altcha) {
  border: none;
  color: var(--bs-secondary);
}
</style>
