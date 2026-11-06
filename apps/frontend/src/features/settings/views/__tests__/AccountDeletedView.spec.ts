import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

const mockSubmit = vi.fn()
vi.mock('@/store/userStore', () => ({
  useUserStore: () => ({ submitAccountDeletionFeedback: mockSubmit }),
}))

import AccountDeletedView from '../AccountDeletedView.vue'

function mountView() {
  return mount(AccountDeletedView, {
    global: {
      stubs: {
        AuthLayout: { template: '<div><slot /></div>' },
        BFormRadio: {
          props: ['id', 'modelValue', 'value', 'disabled'],
          emits: ['update:modelValue'],
          template:
            '<label><input type="radio" :id="id" :value="value" :checked="modelValue === value" :disabled="disabled" @change="$emit(\'update:modelValue\', value)" /><slot /></label>',
        },
        BFormTextarea: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        BButton: {
          props: ['disabled', 'type'],
          template: '<button :type="type" :disabled="disabled"><slot /></button>',
        },
        BAlert: {
          props: ['modelValue'],
          template: '<div v-if="modelValue" data-testid="error"><slot /></div>',
        },
      },
    },
  })
}

const pick = (wrapper: ReturnType<typeof mountView>, reason: string) =>
  wrapper.find(`#account-deleted-reason-${reason}`).trigger('change')

beforeEach(() => {
  mockSubmit.mockReset()
  mockSubmit.mockResolvedValue({ success: true })
})

describe('AccountDeletedView', () => {
  it('shows the confirmation message and all four choices, with no textarea', () => {
    const wrapper = mountView()

    expect(wrapper.text()).toContain('account_deleted.message')
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(4)
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it.each(['found_connection', 'not_a_good_fit', 'bad_experience'])(
    'submits %s immediately and shows the thank-you message',
    async (reason) => {
      const wrapper = mountView()

      await pick(wrapper, reason)
      await flushPromises()

      expect(mockSubmit).toHaveBeenCalledWith({ reason })
      expect(wrapper.find('[data-testid="thank-you"]').exists()).toBe(true)
      expect(wrapper.find('form').exists()).toBe(false)
    }
  )

  it('opens a textarea for "other" without submitting', async () => {
    const wrapper = mountView()

    await pick(wrapper, 'other')
    await flushPromises()

    expect(mockSubmit).not.toHaveBeenCalled()
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('submits the "other" comment through the button and shows the thank-you message', async () => {
    const wrapper = mountView()

    await pick(wrapper, 'other')
    await wrapper.find('textarea').setValue('Too quiet')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockSubmit).toHaveBeenCalledWith({ reason: 'other', comment: 'Too quiet' })
    expect(wrapper.find('[data-testid="thank-you"]').exists()).toBe(true)
  })

  it('does not submit a blank "other" comment', async () => {
    const wrapper = mountView()

    await pick(wrapper, 'other')
    await wrapper.find('textarea').setValue('   ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('shows an error and lets the same choice be retried when submission fails', async () => {
    mockSubmit.mockResolvedValueOnce({ success: false, message: 'nope' })
    const wrapper = mountView()

    await pick(wrapper, 'bad_experience')
    await flushPromises()

    expect(wrapper.find('[data-testid="error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="thank-you"]').exists()).toBe(false)

    await pick(wrapper, 'bad_experience')
    await flushPromises()

    expect(mockSubmit).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-testid="thank-you"]').exists()).toBe(true)
  })

  it('keeps the typed comment when an "other" submission fails', async () => {
    mockSubmit.mockResolvedValueOnce({ success: false, message: 'nope' })
    const wrapper = mountView()

    await pick(wrapper, 'other')
    await wrapper.find('textarea').setValue('Too quiet')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="error"]').exists()).toBe(true)
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('Too quiet')
  })
})
