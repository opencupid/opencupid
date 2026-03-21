/**
 * Tests the onboarding redirect logic in UserHome.
 *
 * UserHome is wrapped in <KeepAlive> in App.vue, which means:
 * - onMounted fires only on the FIRST render of the component instance
 * - onActivated fires on EVERY subsequent visit from the KeepAlive cache
 *
 * The redirect to /onboarding must fire in BOTH hooks so a fresh-registration
 * user who lands on /home is always redirected, regardless of whether the
 * component instance was previously mounted for a different (onboarded) session.
 */
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// ── router ───────────────────────────────────────────────────────────────────
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: {}, query: {} }),
}))

// ── i18n ─────────────────────────────────────────────────────────────────────
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

// ── bootstrap — resolves immediately (profile already in store before mount) ──
vi.mock('@/lib/bootstrap', () => ({
  useBootstrap: () => ({ bootstrap: vi.fn().mockResolvedValue(undefined) }),
}))

// ── child components (stubbed) ────────────────────────────────────────────────
vi.mock('@/features/browse/components/ProfileCardGrid.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('@/features/interaction/components/LikesAndMatchesBanner.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('@/features/shared/components/TagCloud.vue', () => ({
  default: { template: '<div />', emits: ['tag:select'] },
}))
vi.mock('@/assets/icons/interface/search.svg', () => ({
  default: { template: '<svg />' },
}))

// ── ownerProfile store ────────────────────────────────────────────────────────
const mockProfileRef = ref<{ isOnboarded: boolean } | null>(null)

vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => ({
    get profile() {
      return mockProfileRef.value
    },
    matchFilter: null,
    fetchMatchFilter: vi.fn(),
    setMatchFilterTags: vi.fn(),
  }),
}))

// ── findProfileStore ──────────────────────────────────────────────────────────
vi.mock('@/features/browse/stores/findProfileStore', () => ({
  useFindProfileStore: () => ({
    fetchNewProfiles: vi.fn().mockResolvedValue({ success: true, data: { result: [] } }),
  }),
}))

// ── vueuse ────────────────────────────────────────────────────────────────────
vi.mock('@vueuse/core', () => ({
  useBreakpoints: () => ({ smallerOrEqual: () => ref(false) }),
}))

const BContainer = { template: '<div><slot /></div>' }
const BRow = { template: '<div><slot /></div>' }
const BCol = { template: '<div><slot /></div>' }
const BButton = { template: '<button><slot /></button>', props: ['to', 'variant'] }

import UserHome from '../UserHome.vue'

function mountUserHome() {
  return mount(UserHome, {
    global: {
      plugins: [createPinia()],
      components: { BContainer, BRow, BCol, BButton },
      stubs: { teleport: true },
    },
  })
}

/** Flush the microtask queue so async onMounted callbacks complete. */
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('UserHome onboarding redirect', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockClear()
    mockProfileRef.value = null
  })

  describe('on mount (first render / cold start)', () => {
    it('redirects to /onboarding when profile is not onboarded', async () => {
      mockProfileRef.value = { isOnboarded: false }
      mountUserHome()
      await flush()
      expect(mockPush).toHaveBeenCalledWith({ name: 'Onboarding' })
    })

    it('does not redirect when user is already onboarded', async () => {
      mockProfileRef.value = { isOnboarded: true }
      mountUserHome()
      await flush()
      expect(mockPush).not.toHaveBeenCalledWith({ name: 'Onboarding' })
    })

    it('does not redirect when profile is null (bootstrap still in flight)', async () => {
      mockProfileRef.value = null
      mountUserHome()
      await flush()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('on activation (KeepAlive re-entry after prior session)', () => {
    it('redirects to /onboarding when a non-onboarded user activates the cached component', async () => {
      /**
       * Simulates the race condition that caused the original bug:
       * 1. UserHome was previously mounted for an onboarded user whose instance
       *    is now cached in <KeepAlive>. onMounted ran and correctly did NOT redirect.
       * 2. A new non-onboarded user logs in. The router navigates to /home.
       *    KeepAlive reactivates the cached instance — onActivated fires, NOT onMounted.
       *
       * Without the onActivated check, the redirect was silently skipped.
       */

      // Step 1: mount with an onboarded user — no redirect expected
      mockProfileRef.value = { isOnboarded: true }
      const wrapper = mountUserHome()
      await flush()
      expect(mockPush).not.toHaveBeenCalledWith({ name: 'Onboarding' })
      mockPush.mockClear()

      // Step 2: switch to a non-onboarded profile (simulates new-user login)
      // then fire the onActivated hooks the way KeepAlive does
      mockProfileRef.value = { isOnboarded: false }
      const activatedHooks = (wrapper.vm.$ as any).a // Vue 3 internal: activated hooks array
      if (activatedHooks) {
        for (const hook of activatedHooks) hook()
      }
      await wrapper.vm.$nextTick()

      expect(mockPush).toHaveBeenCalledWith({ name: 'Onboarding' })
      wrapper.unmount()
    })
  })
})
