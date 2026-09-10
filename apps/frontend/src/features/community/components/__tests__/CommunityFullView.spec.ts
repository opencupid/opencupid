import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

const replaceMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
}))

vi.mock('@/assets/icons/interface/cross.svg', () => ({
  default: { template: '<span />' },
}))
vi.mock('@/assets/icons/interface/globe.svg', () => ({
  default: { template: '<span class="icon-globe" />' },
}))
vi.mock('@/assets/icons/interface/mail.svg', () => ({
  default: { template: '<span class="icon-mail" />' },
}))

vi.mock('@/lib/responsive', () => ({
  isMdUp: { value: true },
}))

import CommunityFullView from '../CommunityFullView.vue'

const stubs = {
  CommunityCard: {
    props: ['community'],
    template: '<div class="community-card-stub">{{ community.id }}</div>',
  },
  BButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
}

const community = {
  id: 'c-1',
  kind: 'community' as const,
  content: 'Test',
  yearFounded: null,
  contactUrl: null,
  contactEmail: null,
  location: { country: 'HU', cityName: 'Budapest', lat: null, lon: null },
  postedBy: { id: 'p-1', publicName: 'Alice', profileImages: [] },
  tags: [],
} as any

const globalConfig = { stubs, mocks: { $t: (k: string) => k } }

describe('CommunityFullView', () => {
  it('renders the community card', () => {
    const wrapper = mount(CommunityFullView, {
      props: { community },
      global: globalConfig,
    })
    expect(wrapper.find('.community-card-stub').text()).toBe('c-1')
  })

  it('navigates back to Browse when no detailPanelClose provider', async () => {
    replaceMock.mockClear()
    const wrapper = mount(CommunityFullView, {
      props: { community },
      global: globalConfig,
    })
    await wrapper.find('button').trigger('click')
    expect(replaceMock).toHaveBeenCalledWith({ name: 'Browse' })
  })
})

describe('CommunityFullView contact details', () => {
  const mountWith = (contact: Record<string, string | null>) =>
    mount(CommunityFullView, {
      props: { community: { ...community, ...contact } },
      global: globalConfig,
    })

  it('renders no contact block when both fields are null', () => {
    const wrapper = mountWith({})
    expect(wrapper.find('.community-contact').exists()).toBe(false)
  })

  it('renders the website link labelled with its host', () => {
    const wrapper = mountWith({ contactUrl: 'https://example.org/guild/page' })
    const link = wrapper.find('a[href="https://example.org/guild/page"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('example.org')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
  })

  it('renders the contact email as a mailto link', () => {
    const wrapper = mountWith({ contactEmail: 'hello@example.org' })
    const link = wrapper.find('a[href="mailto:hello@example.org"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('hello@example.org')
  })

  it('percent-encodes mailto-delimiter characters in the local part', () => {
    // '#' and '&' are valid in an email local-part but are fragment/query
    // delimiters in a mailto: URI, so an unencoded href would target the
    // wrong recipient (or drop part of the address).
    const wrapper = mountWith({ contactEmail: 'foo#bar&baz@example.org' })
    const link = wrapper.find('a[href="mailto:foo%23bar%26baz@example.org"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('foo#bar&baz@example.org')
  })

  it('renders only the field that is set', () => {
    const wrapper = mountWith({ contactEmail: 'hello@example.org' })
    expect(wrapper.find('.icon-globe').exists()).toBe(false)
    expect(wrapper.find('.icon-mail').exists()).toBe(true)
  })
})
