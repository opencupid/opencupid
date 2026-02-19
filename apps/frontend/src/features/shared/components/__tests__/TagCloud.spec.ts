import { vi, describe, it, expect, beforeEach } from 'vitest'

const push = vi.fn()
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TagCloud from '../TagCloud.vue'
import { useTagsStore } from '@/store/tagStore'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'

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
  push.mockClear()
  // Mock fetchPopularTags to prevent unhandled rejections from onMounted
  const tagStore = useTagsStore()
  tagStore.fetchPopularTags = vi.fn().mockResolvedValue([])
})

describe('TagCloud', () => {
  it('renders tags with varying font sizes', async () => {
    const tagStore = useTagsStore()
    tagStore.popularTags = mockTags

    const wrapper = mount(TagCloud)
    await flushPromises()

    const items = wrapper.findAll('.tag-cloud-item')
    expect(items).toHaveLength(3)

    // Tags should be sorted alphabetically: Art, Hiking, Music
    expect(items[0]!.text()).toBe('Art')
    expect(items[1]!.text()).toBe('Hiking')
    expect(items[2]!.text()).toBe('Music')

    // Art (count=3, min) should have smallest font, Hiking (count=10, max) largest
    const artStyle = items[0]!.attributes('style') ?? ''
    const hikingStyle = items[1]!.attributes('style') ?? ''
    const artSize = parseFloat(artStyle.match(/font-size:\s*([\d.]+)rem/)?.[1] ?? '0')
    const hikingSize = parseFloat(hikingStyle.match(/font-size:\s*([\d.]+)rem/)?.[1] ?? '0')
    expect(hikingSize).toBeGreaterThan(artSize)
  })

  it('renders nothing when tags are empty', async () => {
    const tagStore = useTagsStore()
    tagStore.popularTags = []

    const wrapper = mount(TagCloud)
    await flushPromises()

    expect(wrapper.find('[data-testid="tag-cloud"]').exists()).toBe(false)
  })

  it('navigates to /browse/social on tag click', async () => {
    const tagStore = useTagsStore()
    tagStore.popularTags = mockTags

    const findProfileStore = useFindProfileStore()
    findProfileStore.socialFilter = {
      location: { country: '', cityName: '', lat: null, lon: null },
      tags: [],
    }
    findProfileStore.persistSocialFilter = vi.fn().mockResolvedValue({ success: true })

    const wrapper = mount(TagCloud)
    await flushPromises()

    await wrapper.findAll('.tag-cloud-item')[0]!.trigger('click')
    await flushPromises()

    expect(findProfileStore.socialFilter!.tags).toEqual([{ id: 't2', name: 'Art', slug: 'art' }])
    expect(findProfileStore.persistSocialFilter).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/browse/social')
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
