import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

// jsdom has no layout engine — stub useElementSize to return fixed dimensions
vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    useElementSize: () => ({ width: ref(600), height: ref(400), stop: () => {} }),
  }
})

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
import { bus } from '@/lib/bus'

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
    const firstEmit = emitted?.[0]
    expect(firstEmit?.[0]).toEqual(mockTags[0])
  })

  it('passes location prop to fetchPopularTags', async () => {
    const tagStore = useTagsStore()
    tagStore.fetchPopularTags = vi.fn().mockResolvedValue([])

    mount(TagCloud, {
      props: { location: { country: 'DE' } },
    })
    await flushPromises()

    expect(tagStore.fetchPopularTags).toHaveBeenCalledWith({
      country: 'DE',
      limit: 50,
    })
  })

  it('handles duplicate tag names without duplicate key warnings', async () => {
    const tagStore = useTagsStore()
    const duplicateNameTags = [
      { id: 't1', name: 'Music', slug: 'music-a', count: 10 },
      { id: 't2', name: 'Music', slug: 'music-b', count: 7 },
    ]
    tagStore.popularTags = duplicateNameTags
    tagStore.fetchPopularTags = vi.fn().mockImplementation(async () => {
      tagStore.popularTags = duplicateNameTags
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const wrapper = mount(TagCloud)
    await flushPromises()

    expect(wrapper.findAll('.tag-cloud-word')).toHaveLength(2)
    const duplicateKeyWarnings = warnSpy.mock.calls.filter((call) =>
      String(call[0]).includes('Duplicate keys found during update')
    )
    expect(duplicateKeyWarnings).toHaveLength(0)

    warnSpy.mockRestore()
  })

  it('re-fetches popular tags on language:changed bus event', async () => {
    const tagStore = useTagsStore()
    tagStore.fetchPopularTags = vi.fn().mockResolvedValue([])

    const wrapper = mount(TagCloud, {
      props: { location: { country: 'DE' }, limit: 10 },
    })
    await flushPromises()

    expect(tagStore.fetchPopularTags).toHaveBeenCalledTimes(1)
    bus.emit('language:changed', { language: 'fr' })
    await flushPromises()

    expect(tagStore.fetchPopularTags).toHaveBeenCalledTimes(2)
    expect(tagStore.fetchPopularTags).toHaveBeenLastCalledWith({
      country: 'DE',
      limit: 10,
    })

    wrapper.unmount()
  })
})
