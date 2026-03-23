import { describe, it, expect, vi } from 'vitest'
import { computed } from 'vue'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: computed(() => 'en') }),
}))

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    useTimeAgoIntl: (_time: unknown, options?: { locale?: string }) => {
      // Return a string that encodes the locale so we can assert on it
      return `mocked-time-ago-${options?.locale ?? 'unknown'}`
    },
  }
})

import LocalizedTimeAgo from '../LocalizedTimeAgo.vue'

describe('LocalizedTimeAgo', () => {
  it('renders time-ago text using the current locale', () => {
    const wrapper = mount(LocalizedTimeAgo, {
      props: { time: new Date('2026-03-23T12:00:00Z') },
    })

    expect(wrapper.text()).toContain('mocked-time-ago-')
  })

  it('exposes timeAgo via scoped slot', () => {
    const wrapper = mount(LocalizedTimeAgo, {
      props: { time: new Date('2026-03-23T12:00:00Z') },
      slots: {
        default: `<template #default="{ timeAgo }"><span class="slot-content">{{ timeAgo }}</span></template>`,
      },
    })

    expect(wrapper.find('.slot-content').text()).toContain('mocked-time-ago-')
  })

  it('passes locale from useI18n to useTimeAgoIntl', () => {
    const wrapper = mount(LocalizedTimeAgo, {
      props: { time: new Date('2026-03-23T12:00:00Z') },
    })

    // Our mock encodes locale into the output string
    expect(wrapper.text()).toContain('mocked-time-ago-en')
  })
})
