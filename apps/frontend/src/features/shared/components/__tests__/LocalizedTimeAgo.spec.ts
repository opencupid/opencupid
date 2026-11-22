import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mount } from '@vue/test-utils'

const currentLocale = ref('en')

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: computed(() => currentLocale.value) }),
}))

import LocalizedTimeAgo from '../LocalizedTimeAgo.vue'

const NOW = new Date('2026-11-22T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000)

describe('LocalizedTimeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
    currentLocale.value = 'en'
  })

  it('renders the long English form', () => {
    const wrapper = mount(LocalizedTimeAgo, { props: { time: daysAgo(90) } })
    expect(wrapper.text()).toBe('3 months ago')
  })

  it('renders the compact Hungarian forms', () => {
    currentLocale.value = 'hu'
    expect(mount(LocalizedTimeAgo, { props: { time: daysAgo(180) } }).text()).toBe('6 hónapja')
    expect(mount(LocalizedTimeAgo, { props: { time: daysAgo(14) } }).text()).toBe('2 hete')
  })

  it('exposes timeAgo via scoped slot', () => {
    const wrapper = mount(LocalizedTimeAgo, {
      props: { time: daysAgo(90) },
      slots: {
        default: `<template #default="{ timeAgo }"><span class="slot-content">{{ timeAgo }}</span></template>`,
      },
    })
    expect(wrapper.find('.slot-content').text()).toBe('3 months ago')
  })
})
