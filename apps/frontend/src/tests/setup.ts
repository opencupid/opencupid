import { config } from '@vue/test-utils'
import {
  BInput,
  BForm,
  BButton,
  BFormFloatingLabel,
  BFormTextarea,
  BFormCheckbox,
  BFormFile,
  BFormRadio,
  BCard,
  BFormInvalidFeedback,
} from 'bootstrap-vue-next'
;(globalThis as any).__APP_CONFIG__ = {
  API_BASE_URL: 'http://localhost',
  FRONTEND_URL: 'http://localhost',
  WS_BASE_URL: 'ws://localhost',
  MEDIA_URL_BASE: 'http://localhost/user-content',
  NODE_ENV: 'test',
  VAPID_PUBLIC_KEY: '',
  SENTRY_DSN: '',
  SITE_NAME: 'OpenCupid',
  JITSI_DOMAIN: '',
  VOICE_MESSAGE_MAX_DURATION: '120',
  MAPTILER_API_KEY: '',
}
import packageJson from '../../package.json'
;(globalThis as any).__APP_VERSION__ = packageJson.version

config.global.components = {}
