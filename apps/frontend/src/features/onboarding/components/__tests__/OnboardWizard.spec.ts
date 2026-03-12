import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.stubGlobal('__APP_CONFIG__', { SITE_NAME: 'TestSite' })
vi.mock('@/assets/icons/interface/sun.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/logout.svg', () => ({ default: { template: '<div />' } }))

// Mock d3-cloud — jsdom has no canvas, so we simulate the layout synchronously
let endCallback: ((words: any[]) => void) | null = null
vi.mock('d3-cloud', () => {
  const chainable = () => {
    const api: any = {}
    const methods = ['size', 'words', 'font', 'fontSize', 'rotate', 'padding', 'random', 'canvas']
    let inputWords: any[] = []

    for (const m of methods) {
      api[m] = (...args: any[]) => {
        if (m === 'words' && args.length) inputWords = args[0]
        return api
      }
    }
    api.on = (_event: string, cb: (words: any[]) => void) => {
      endCallback = cb
      return api
    }
    api.start = () => {
      if (endCallback) {
        const positioned = inputWords.map((w, i) => ({
          text: w.text,
          size: w.size,
          x: i * 50,
          y: i * 30,
        }))
        endCallback(positioned)
      }
      return api
    }
    return api
  }
  return { default: chainable }
})

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), patch: vi.fn() },
  axios: { isAxiosError: () => false },
  safeApiCall: vi.fn(),
  isApiOnline: vi.fn(),
}))

import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import OnboardWizard from '../OnboardWizard.vue'
import { useTagsStore } from '@/store/tagStore'

const mockTags = [
  { id: 't1', name: 'Hiking', slug: 'hiking', count: 10 },
  { id: 't2', name: 'Art', slug: 'art', count: 3 },
  { id: 't3', name: 'Music', slug: 'music', count: 7 },
]

const stubComponents = {
  LanguageSelector: { template: '<div />' },
  TagSelector: { template: '<div />' },
  IntrotextEditor: { template: '<div />' },
  ImageEditor: { template: '<div />' },
  DatingSteps: { template: '<div />' },
  LocationSelectorComponent: { template: '<div />' },
  BackButton: { template: '<div />' },
  PublicNameInput: { template: '<div />' },
  LogoutButton: { template: '<div />' },
  IconSun: { template: '<div />' },
  IconLogout: { template: '<div />' },
  BForm: { template: '<form><slot /></form>' },
  BButton: {
    template: '<button @click="$attrs.onClick?.()"><slot /></button>',
    inheritAttrs: false,
  },
}

function mountWizard(overrides: Record<string, any> = {}) {
  const formData = {
    publicName: 'TestUser',
    location: { country: '' },
    tags: [] as any[],
    languages: ['en'],
    isDatingActive: false,
    isSocialActive: true,
    introSocialLocalized: {},
    introDatingLocalized: {},
    birthday: null,
    gender: null,
    pronouns: null,
    relationship: null,
    hasKids: null,
    ...overrides,
  }

  const wrapper = mount(OnboardWizard, {
    props: { modelValue: formData },
    global: {
      stubs: stubComponents,
    },
  })

  return { wrapper, formData }
}

beforeEach(() => {
  setActivePinia(createPinia())
  endCallback = null
  const tagStore = useTagsStore()
  tagStore.fetchPopularTags = vi.fn().mockResolvedValue([])
})

describe('OnboardWizard TagCloud integration', () => {
  it('does not render TagCloud when formData.location has no country', async () => {
    const tagStore = useTagsStore()
    tagStore.popularTags = mockTags

    const { wrapper } = mountWizard({ location: {} })

    // Navigate to the interests step: publicname → location → interests
    for (let i = 0; i < 2; i++) {
      await wrapper.find('button').trigger('click')
      await flushPromises()
    }

    expect(wrapper.find('[data-testid="tag-cloud"]').exists()).toBe(false)
  })

  it('renders TagCloud when formData.location has a country', async () => {
    const tagStore = useTagsStore()
    tagStore.popularTags = mockTags
    tagStore.fetchPopularTags = vi.fn().mockImplementation(async () => {
      tagStore.popularTags = mockTags
    })

    const { wrapper } = mountWizard({ location: { country: 'DE' } })

    for (let i = 0; i < 2; i++) {
      await wrapper.find('button').trigger('click')
      await flushPromises()
    }

    expect(wrapper.find('[data-testid="tag-cloud"]').exists()).toBe(true)
    const texts = wrapper.findAll('.tag-cloud-word')
    expect(texts.length).toBeGreaterThan(0)
  })

  it('clicking a tag in the cloud adds it to formData.tags', async () => {
    const tagStore = useTagsStore()
    tagStore.popularTags = mockTags
    tagStore.fetchPopularTags = vi.fn().mockImplementation(async () => {
      tagStore.popularTags = mockTags
    })

    const { wrapper, formData } = mountWizard({ location: { country: 'DE' } })

    for (let i = 0; i < 2; i++) {
      await wrapper.find('button').trigger('click')
      await flushPromises()
    }

    const hikingEl = wrapper.findAll('.tag-cloud-word').find((t) => t.text().trim() === 'Hiking')
    if (!hikingEl) throw new Error('Hiking tag not found')
    await hikingEl.trigger('click')
    await flushPromises()

    expect(formData.tags).toEqual([{ id: 't1', name: 'Hiking', slug: 'hiking' }])
  })

  it('clicking the same tag twice does not duplicate it', async () => {
    const tagStore = useTagsStore()
    tagStore.popularTags = mockTags
    tagStore.fetchPopularTags = vi.fn().mockImplementation(async () => {
      tagStore.popularTags = mockTags
    })

    const { wrapper, formData } = mountWizard({ location: { country: 'DE' } })

    for (let i = 0; i < 2; i++) {
      await wrapper.find('button').trigger('click')
      await flushPromises()
    }

    const getHikingEl = () =>
      wrapper.findAll('.tag-cloud-word').find((t) => t.text().trim() === 'Hiking')

    const el1 = getHikingEl()
    if (!el1) throw new Error('Hiking tag not found')
    await el1.trigger('click')
    await flushPromises()
    const el2 = getHikingEl()
    if (!el2) throw new Error('Hiking tag not found')
    await el2.trigger('click')
    await flushPromises()

    expect(formData.tags).toHaveLength(1)
    expect(formData.tags[0].id).toBe('t1')
  })
})
