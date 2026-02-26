import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

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
      // Simulate layout by assigning positions to each word
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

import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TagCloud from '../TagCloud.vue'
import { useTagsStore } from '@/store/tagStore'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), patch: vi.fn() },
  axios: { isAxiosError: () => false },
  safeApiCall: vi.fn(),
  isApiOnline: vi.fn(),
}))

const mockTags = [
  { id: 't1', name: 'Hiking', slug: 'hiking', count: 10 },
  { id: 't2', name: 'Art', slug: 'art', count: 3 },
  { id: 't3', name: 'Music', slug: 'music', count: 7 },
]

beforeEach(() => {
  setActivePinia(createPinia())
  endCallback = null
  const tagStore = useTagsStore()
  tagStore.fetchPopularTags = vi.fn().mockResolvedValue([])
})

describe('TagCloud', () => {
  it('renders SVG text elements for tags', async () => {
    const tagStore = useTagsStore()
    tagStore.popularTags = mockTags
    tagStore.fetchPopularTags = vi.fn().mockImplementation(async () => {
      tagStore.popularTags = mockTags
    })

    const wrapper = mount(TagCloud)
    await flushPromises()

    const texts = wrapper.findAll('.tag-cloud-word')
    expect(texts).toHaveLength(3)
    const names = texts.map((t) => t.text().trim())
    expect(names).toContain('Hiking')
    expect(names).toContain('Art')
    expect(names).toContain('Music')
  })

  it('renders nothing when tags are empty', async () => {
    const tagStore = useTagsStore()
    tagStore.popularTags = []

    const wrapper = mount(TagCloud)
    await flushPromises()

    expect(wrapper.find('[data-testid="tag-cloud"]').exists()).toBe(false)
  })

  it('emits tag:select on tag click', async () => {
    const tagStore = useTagsStore()
    tagStore.popularTags = mockTags
    tagStore.fetchPopularTags = vi.fn().mockImplementation(async () => {
      tagStore.popularTags = mockTags
    })

    const wrapper = mount(TagCloud)
    await flushPromises()

    const texts = wrapper.findAll('.tag-cloud-word')
    const hikingEl = texts.find((t) => t.text().trim() === 'Hiking')
    expect(hikingEl).toBeDefined()
    await hikingEl!.trigger('click')
    await flushPromises()

    const emitted = wrapper.emitted('tag:select')
    expect(emitted).toBeDefined()
    expect(emitted).toHaveLength(1)
    expect(emitted![0][0]).toEqual(mockTags[0])
  })

  it('passes location prop to fetchPopularTags', async () => {
    const tagStore = useTagsStore()
    tagStore.fetchPopularTags = vi.fn().mockResolvedValue([])

    mount(TagCloud, {
      props: { location: { country: 'DE', cityName: 'Berlin' } },
    })
    await flushPromises()

    expect(tagStore.fetchPopularTags).toHaveBeenCalledWith({
      country: 'DE',
      cityName: 'Berlin',
      limit: 50,
    })
  })
})
