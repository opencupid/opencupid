import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    useElementSize: () => ({ width: ref(600), height: ref(400), stop: () => {} }),
  }
})
vi.stubGlobal('__APP_CONFIG__', { SITE_NAME: 'TestSite' })
vi.mock('@/assets/icons/interface/sun.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/logout.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/images/app/cupid.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/images/app/curved-arrow.svg', () => ({ default: { template: '<div />' } }))

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
import { useProfileImageStore } from '@/features/images/stores/profileImageStore'

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
  BFormCheckbox: { template: '<label><slot /></label>' },
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

describe('OnboardWizard photos step', () => {
  type Wrapper = ReturnType<typeof mountWizard>['wrapper']
  const findButton = (wrapper: Wrapper, label: string) =>
    wrapper.findAll('button').find((b) => b.text() === label)
  const clickButton = async (wrapper: Wrapper, label: string) => {
    const button = findButton(wrapper, label)
    if (!button) throw new Error(`Button ${label} not found`)
    await button.trigger('click')
    await flushPromises()
  }
  const clickNext = (wrapper: Wrapper) => clickButton(wrapper, 'onboarding.wizard.next')

  // publicname → location → interests → languages → introSocial → photos
  const goToPhotos = async (wrapper: Wrapper) => {
    for (let i = 0; i < 5; i++) await clickNext(wrapper)
  }

  it('warns before continuing without a photo, and lets the user go back to adding one', async () => {
    const { wrapper } = mountWizard({ location: { country: 'DE' } })
    await goToPhotos(wrapper)

    expect(wrapper.find('[data-testid="no-photo-warning"]').exists()).toBe(false)
    await clickNext(wrapper)

    expect(wrapper.find('[data-testid="no-photo-warning"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('onboarding.photos_title')
    expect(findButton(wrapper, 'onboarding.wizard.next')).toBeUndefined()

    await clickButton(wrapper, 'onboarding.photos_missing_add')
    expect(wrapper.find('[data-testid="no-photo-warning"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('onboarding.photos_title')
  })

  it('continues past the photos step when the user confirms', async () => {
    const { wrapper } = mountWizard({ location: { country: 'DE' } })
    await goToPhotos(wrapper)
    await clickNext(wrapper)

    await clickButton(wrapper, 'onboarding.photos_missing_continue')

    expect(wrapper.find('[data-testid="no-photo-warning"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('onboarding.dating_mode_switch')
  })

  it('does not warn when a photo was added', async () => {
    const imageStore = useProfileImageStore()
    imageStore.images = [{ id: 'img1', position: 0, variants: [] } as any]

    const { wrapper } = mountWizard({ location: { country: 'DE' } })
    await goToPhotos(wrapper)
    await clickNext(wrapper)

    expect(wrapper.find('[data-testid="no-photo-warning"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('onboarding.dating_mode_switch')
  })
})
