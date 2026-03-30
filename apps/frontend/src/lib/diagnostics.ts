import { captureEvent, getClient } from '@sentry/vue'
import { useAuthStore } from '@/features/auth/stores/authStore'

export type Checkpoint =
  | 'auth:verify_success'
  | 'onboarding:started'
  | 'onboarding:step_changed'
  | 'onboarding:completed'

export function logCheckpoint(checkpoint: Checkpoint, extra?: Record<string, unknown>): void {
  if (!getClient()) return

  const authStore = useAuthStore()

  captureEvent({
    message: `checkpoint:${checkpoint}`,
    level: 'info',
    tags: {
      checkpoint,
      flow: checkpoint.split(':')[0],
    },
    user: {
      id: authStore.getUserId ?? undefined,
    },
    contexts: {
      client: {
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        user_agent: navigator.userAgent,
        language: navigator.language,
        online: navigator.onLine,
        url: window.location.href,
      },
    },
    extra,
  })
}
