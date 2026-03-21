import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))
vi.mock('@/lib/bootstrap', () => ({
  useBootstrap: () => ({ bootstrap: vi.fn().mockResolvedValue(undefined) }),
}))
vi.mock('@/store/userStore', () => ({
  useUserStore: () => mockUserStore,
}))
vi.mock('@/features/auth/stores/authStore', () => ({
  useAuthStore: () => ({ logout: vi.fn() }),
}))
vi.mock('@/assets/icons/interface/setting-2.svg', () => ({
  default: { template: '<svg />' },
}))
vi.mock('@/features/shared/ui/MiddleColumn.vue', () => ({
  default: { template: '<div><slot /></div>' },
}))
vi.mock('@/features/shared/ui/RouterBackButton.vue', () => ({
  default: { template: '<button />' },
}))
vi.mock('@/features/shared/ui/SecondaryNav.vue', () => ({
  default: { template: '<div><slot name="items-center" /></div>' },
}))

const mockUserStore = {
  user: { email: 'user@example.com', phonenumber: null },
  isLoading: false,
  fetchUser: vi.fn().mockResolvedValue({ success: true }),
  deleteAccount: vi.fn().mockResolvedValue({ success: true }),
}

const t = (k: string) => k

const BOverlay = { props: ['show'], template: '<div><slot /></div>' }
const BFormLabel = { template: '<label><slot /></label>' }
const BFormInput = {
  props: ['modelValue', 'placeholder'],
  template:
    '<input id="close-account-confirm" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown="$emit(\'keydown\', $event)" />',
  emits: ['update:modelValue', 'keydown'],
}
const BButton = {
  props: ['disabled'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  emits: ['click'],
}

import CloseAccountView from '../CloseAccountView.vue'

function mountView() {
  return mount(CloseAccountView, {
    global: {
      mocks: { $t: t },
      components: { BOverlay, BFormLabel, BFormInput, BButton },
    },
  })
}

describe('CloseAccountView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockUserStore.fetchUser.mockClear()
    mockUserStore.deleteAccount.mockClear()
  })

  it('renders confirm input', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('input#close-account-confirm').exists()).toBe(true)
  })

  it('confirm button is disabled when input is empty', async () => {
    const wrapper = mountView()
    await flushPromises()
    const btn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('settings.close_account_ok_button'))
    expect((btn!.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('confirm button is disabled when input does not match email', async () => {
    const wrapper = mountView()
    await flushPromises()
    await wrapper.find('input#close-account-confirm').setValue('wrong@example.com')
    const btn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('settings.close_account_ok_button'))
    expect((btn!.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('confirm button is enabled when input matches email (case-insensitive)', async () => {
    const wrapper = mountView()
    await flushPromises()
    await wrapper.find('input#close-account-confirm').setValue('USER@EXAMPLE.COM')
    const btn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('settings.close_account_ok_button'))
    expect((btn!.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('calls deleteAccount when confirm button clicked with correct input', async () => {
    const wrapper = mountView()
    await flushPromises()
    await wrapper.find('input#close-account-confirm').setValue('user@example.com')
    const btn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('settings.close_account_ok_button'))
    await btn!.trigger('click')
    expect(mockUserStore.deleteAccount).toHaveBeenCalledOnce()
  })

  it('does not call deleteAccount when input does not match', async () => {
    const wrapper = mountView()
    await flushPromises()
    await wrapper.find('input#close-account-confirm').setValue('wrong@example.com')
    const btn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('settings.close_account_ok_button'))
    await btn!.trigger('click')
    expect(mockUserStore.deleteAccount).not.toHaveBeenCalled()
  })

  it('calls fetchUser on mount', async () => {
    mountView()
    await flushPromises()
    expect(mockUserStore.fetchUser).toHaveBeenCalledOnce()
  })
})
