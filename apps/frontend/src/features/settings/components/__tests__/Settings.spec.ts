import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPush = vi.fn()
const mockLogout = vi.fn()
const mockDeleteAccount = vi.fn()

vi.mock('vue-router', () => ({ useRouter: () => ({ push: mockPush }) }))
vi.mock('@/features/auth/stores/authStore', () => ({
  useAuthStore: () => ({ logout: mockLogout }),
}))
vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => ({
    optInSettings: {},
    fetchOptInSettings: vi.fn(),
    fetchOwnerProfile: vi.fn(),
  }),
}))
vi.mock('@/store/userStore', () => ({
  useUserStore: () => ({ user: null, fetchUser: vi.fn(), deleteAccount: mockDeleteAccount }),
}))
vi.mock('@/features/app/composables/usePwaInstall', () => ({ usePwaInstall: vi.fn() }))
const mockTrack = vi.hoisted(() => vi.fn())
vi.mock('@/lib/umami', () => ({ tracker: { track: mockTrack } }))
vi.mock('@/assets/icons/interface/logout.svg', () => ({ default: { template: '<svg />' } }))
vi.mock('@/assets/icons/interface/globe.svg', () => ({ default: { template: '<svg />' } }))

import Settings from '../Settings.vue'
import CloseAccountDialog from '../CloseAccountDialog.vue'

function mountSettings() {
  return shallowMount(Settings, { global: { mocks: { $t: (k: string) => k } } })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Settings close account', () => {
  it('tracks opening the dialog, without counting it as a confirmation', async () => {
    const wrapper = shallowMount(Settings, {
      global: {
        mocks: { $t: (k: string) => k },
        stubs: { BButton: { template: '<button><slot /></button>' } },
      },
    })

    const button = wrapper
      .findAll('button')
      .find((b) => b.text() === 'settings.close_account_button')!
    await button.trigger('click')

    expect(mockTrack).toHaveBeenCalledTimes(1)
    expect(mockTrack).toHaveBeenCalledWith('open-delete-dialog')
    expect(wrapper.findComponent(CloseAccountDialog).props('modelValue')).toBe(true)
  })

  it('tracks the confirmation', async () => {
    mockDeleteAccount.mockResolvedValue({ success: true })
    const wrapper = mountSettings()

    wrapper.findComponent(CloseAccountDialog).vm.$emit('confirm', 'a@b.com')
    await flushPromises()

    expect(mockTrack).toHaveBeenCalledWith('confirm-delete')
  })

  it('logs out and opens the account-deleted screen after a successful deletion', async () => {
    mockDeleteAccount.mockResolvedValue({ success: true })
    const wrapper = mountSettings()

    wrapper.findComponent(CloseAccountDialog).vm.$emit('confirm', 'a@b.com')
    await flushPromises()

    expect(mockDeleteAccount).toHaveBeenCalledWith('a@b.com')
    expect(mockLogout).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith({ name: 'AccountDeleted' })
    expect(mockLogout.mock.invocationCallOrder[0]).toBeLessThan(
      mockPush.mock.invocationCallOrder[0]!
    )
  })

  it('stays put when the deletion fails', async () => {
    mockDeleteAccount.mockResolvedValue({ success: false, message: 'nope' })
    const wrapper = mountSettings()

    wrapper.findComponent(CloseAccountDialog).vm.$emit('confirm', 'a@b.com')
    await flushPromises()

    expect(mockLogout).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })
})
