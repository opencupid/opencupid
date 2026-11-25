import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/assets/icons/interface/message.svg', () => ({ default: { template: '<svg />' } }))

const sendHelpRequest = vi.hoisted(() => vi.fn())
vi.mock('@/features/messaging/stores/messageStore', () => ({
  useMessageStore: () => ({ sendHelpRequest }),
}))

import OnboardingHelp from '../OnboardingHelp.vue'

let wrapper: VueWrapper

function mountHelp(contactEmail = 'help@example.org') {
  vi.stubGlobal('__APP_CONFIG__', { EMAIL_REPLY_TO: contactEmail })
  wrapper = mount(OnboardingHelp, { props: { step: 0 }, attachTo: document.body })
}

const helpButton = () => wrapper.get('.help-button')
const popup = () => wrapper.find('[role="dialog"]')
const draft = () => (wrapper.get('textarea').element as HTMLTextAreaElement).value
const isPulsing = () => helpButton().classes('help-button-pulse')
const toggle = async () => {
  await helpButton().trigger('click')
  await flushPromises()
}
const sendMessage = async (text: string) => {
  await wrapper.get('textarea').setValue(text)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers()
  sendHelpRequest.mockReset().mockResolvedValue({ success: true })
})

afterEach(() => {
  wrapper.unmount()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('OnboardingHelp popup', () => {
  it('opens on click with the textarea focused, and toggles closed', async () => {
    mountHelp()
    expect(helpButton().attributes('title')).toBe('onboarding.help.button_hint')
    expect(popup().exists()).toBe(false)

    await toggle()
    expect(popup().exists()).toBe(true)
    expect(document.activeElement).toBe(wrapper.get('textarea').element)

    await toggle()
    expect(popup().exists()).toBe(false)
  })

  it('closes on Escape and keeps the draft', async () => {
    mountHelp()
    await toggle()
    await wrapper.get('textarea').setValue('half written')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(popup().exists()).toBe(false)

    await toggle()
    expect(draft()).toBe('half written')
  })

  it('shows the contact address', async () => {
    mountHelp()
    await toggle()
    expect(wrapper.get('a').attributes('href')).toBe('mailto:help@example.org')
    expect(wrapper.get('a').text()).toBe('help@example.org')
  })

  it('leaves the contact line out when no address is configured', async () => {
    mountHelp('')
    await toggle()
    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('onboarding.help.contact')
  })

  it('sends the message and confirms, with an empty form on the next open', async () => {
    mountHelp()
    await toggle()
    await sendMessage('The map is blank')

    expect(sendHelpRequest).toHaveBeenCalledWith('The map is blank')
    expect(wrapper.text()).toContain('onboarding.help.sent')
    expect(wrapper.find('textarea').exists()).toBe(false)

    await toggle()
    await toggle()
    expect(draft()).toBe('')
  })

  it('closes 20 seconds after the confirmation', async () => {
    mountHelp()
    await toggle()
    await sendMessage('The map is blank')
    vi.advanceTimersByTime(19_000)
    await flushPromises()
    expect(popup().exists()).toBe(true)
    vi.advanceTimersByTime(1_000)
    await flushPromises()
    expect(popup().exists()).toBe(false)
  })

  it('does not close a popup reopened to write another message', async () => {
    mountHelp()
    await toggle()
    await sendMessage('The map is blank')
    await toggle()
    await toggle()
    vi.advanceTimersByTime(20_000)
    await flushPromises()
    expect(popup().exists()).toBe(true)
  })

  it('stays open when sending fails', async () => {
    sendHelpRequest.mockResolvedValue({ success: false, message: 'nope' })
    mountHelp()
    await toggle()
    await sendMessage('The map is blank')
    vi.advanceTimersByTime(20_000)
    await flushPromises()
    expect(popup().exists()).toBe(true)
  })

  it('keeps the message and shows an error when sending fails', async () => {
    sendHelpRequest.mockResolvedValue({ success: false, message: 'nope' })
    mountHelp()
    await toggle()
    await sendMessage('The map is blank')

    expect(wrapper.get('[role="alert"]').text()).toBe('onboarding.help.error')
    expect(draft()).toBe('The map is blank')
  })

  it('does not send a blank message', async () => {
    mountHelp()
    await toggle()
    await sendMessage('   ')
    expect(sendHelpRequest).not.toHaveBeenCalled()
  })
})

describe('OnboardingHelp pulse', () => {
  const wait = async (ms: number) => {
    vi.advanceTimersByTime(ms)
    await flushPromises()
  }

  it('starts after a minute on the same step', async () => {
    mountHelp()
    await wait(59_000)
    expect(isPulsing()).toBe(false)
    await wait(1_000)
    expect(isPulsing()).toBe(true)
  })

  it('stops and starts counting again when the step changes', async () => {
    mountHelp()
    await wait(50_000)
    await wrapper.setProps({ step: 1 })
    await wait(50_000)
    expect(isPulsing()).toBe(false)
    await wait(10_000)
    expect(isPulsing()).toBe(true)

    await wrapper.setProps({ step: 2 })
    expect(isPulsing()).toBe(false)
  })

  it('stops while the popup is open, and starts counting again when it closes', async () => {
    mountHelp()
    await wait(60_000)
    await toggle()
    expect(isPulsing()).toBe(false)
    await wait(120_000)
    expect(isPulsing()).toBe(false)

    await toggle()
    await wait(59_000)
    expect(isPulsing()).toBe(false)
    await wait(1_000)
    expect(isPulsing()).toBe(true)
  })

  it('is not delayed by clicks elsewhere on the page', async () => {
    mountHelp()
    await wait(50_000)
    document.body.click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await wait(10_000)
    expect(isPulsing()).toBe(true)
  })
})
