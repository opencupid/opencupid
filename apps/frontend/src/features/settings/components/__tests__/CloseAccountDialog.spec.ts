import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import CloseAccountDialog from '../CloseAccountDialog.vue'

const t = (k: string) => k

function mountDialog(props: { userIdentifier: string | null; loading?: boolean }, show = true) {
  return mount(CloseAccountDialog, {
    props: {
      userIdentifier: props.userIdentifier,
      loading: props.loading ?? false,
      modelValue: show,
    },
    global: {
      mocks: { $t: t },
      stubs: {
        BModal: {
          props: ['show', 'busy', 'okDisabled', 'title', 'okTitle', 'cancelTitle'],
          template:
            '<div data-testid="bmodal"><slot /><button data-testid="ok-btn" :disabled="okDisabled" @click="$emit(\'ok\', $event)">OK</button></div>',
          emits: ['ok', 'cancel', 'hidden', 'update:modelValue'],
        },
        BOverlay: {
          props: ['show'],
          template: '<div data-testid="boverlay"><slot /></div>',
        },
      },
    },
  })
}

describe('CloseAccountDialog', () => {
  it('renders confirm input', () => {
    const wrapper = mountDialog({ userIdentifier: 'user@example.com' })
    expect(wrapper.find('input#close-account-confirm').exists()).toBe(true)
  })

  it('ok button is disabled when input is empty', () => {
    const wrapper = mountDialog({ userIdentifier: 'user@example.com' })
    const okBtn = wrapper.find('[data-testid="ok-btn"]')
    expect((okBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('ok button is disabled when input does not match email', async () => {
    const wrapper = mountDialog({ userIdentifier: 'user@example.com' })
    await wrapper.find('input#close-account-confirm').setValue('wrong@example.com')
    const okBtn = wrapper.find('[data-testid="ok-btn"]')
    expect((okBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('ok button is enabled when input matches email (case-insensitive)', async () => {
    const wrapper = mountDialog({ userIdentifier: 'user@example.com' })
    await wrapper.find('input#close-account-confirm').setValue('USER@EXAMPLE.COM')
    const okBtn = wrapper.find('[data-testid="ok-btn"]')
    expect((okBtn.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('emits confirm with the typed input when ok button clicked with correct email', async () => {
    const wrapper = mountDialog({ userIdentifier: 'user@example.com' })
    await wrapper.find('input#close-account-confirm').setValue('  USER@example.com  ')
    await wrapper.find('[data-testid="ok-btn"]').trigger('click')
    const events = wrapper.emitted('confirm')
    expect(events).toBeTruthy()
    expect(events![0]).toEqual(['USER@example.com'])
  })

  it('does not emit confirm when ok button clicked with wrong email', async () => {
    const wrapper = mountDialog({ userIdentifier: 'user@example.com' })
    await wrapper.find('input#close-account-confirm').setValue('wrong@example.com')
    await wrapper.find('[data-testid="ok-btn"]').trigger('click')
    expect(wrapper.emitted('confirm')).toBeFalsy()
  })

  it('ok button stays disabled when userIdentifier is null, even with empty input', () => {
    const wrapper = mountDialog({ userIdentifier: null })
    const okBtn = wrapper.find('[data-testid="ok-btn"]')
    expect((okBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('ok button is enabled when input matches phone number', async () => {
    const wrapper = mountDialog({ userIdentifier: '+1234567890' })
    await wrapper.find('input#close-account-confirm').setValue('+1234567890')
    const okBtn = wrapper.find('[data-testid="ok-btn"]')
    expect((okBtn.element as HTMLButtonElement).disabled).toBe(false)
  })
})
