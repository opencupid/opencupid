import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/assets/images/app/curved-arrow.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
  safeApiCall: vi.fn(),
  isApiOnline: vi.fn(),
}))
vi.mock('@/store/tagStore', () => ({
  useTagsStore: () => ({ popularTags: [], fetchPopularTags: vi.fn() }),
}))

import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TagExplorer from '../TagExplorer.vue'

const TagSelectorStub = {
  name: 'TagSelector',
  template: '<div />',
  emits: ['update:modelValue', 'dropdown:open', 'dropdown:close'],
  props: { modelValue: { default: () => [] }, initialOptions: { default: () => [] }, hint: { default: null } },
}

const TagCloudStub = {
  name: 'TagCloud',
  template: '<div class="tag-cloud-container" />',
  props: ['location', 'showLoading'],
}

function mountExplorer(location = { country: 'DE' }) {
  return mount(TagExplorer, {
    props: { modelValue: [], location },
    global: {
      stubs: { TagSelector: TagSelectorStub, TagCloud: TagCloudStub },
    },
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('TagExplorer', () => {
  it('adds tag-cloud--inactive class on TagCloud when dropdown opens', async () => {
    const wrapper = mountExplorer()
    await flushPromises()

    const tagCloud = wrapper.findComponent(TagCloudStub)
    expect(tagCloud.classes()).not.toContain('tag-cloud--inactive')

    await wrapper.findComponent(TagSelectorStub).vm.$emit('dropdown:open')
    await wrapper.vm.$nextTick()

    expect(tagCloud.classes()).toContain('tag-cloud--inactive')
  })

  it('removes tag-cloud--inactive class on TagCloud when dropdown closes', async () => {
    const wrapper = mountExplorer()
    await flushPromises()

    await wrapper.findComponent(TagSelectorStub).vm.$emit('dropdown:open')
    await wrapper.vm.$nextTick()
    await wrapper.findComponent(TagSelectorStub).vm.$emit('dropdown:close')
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(TagCloudStub).classes()).not.toContain('tag-cloud--inactive')
  })

  it('does not render TagCloud when location has no country', async () => {
    const wrapper = mountExplorer({ country: '' } as any)
    await flushPromises()
    expect(wrapper.findComponent(TagCloudStub).exists()).toBe(false)
  })
})
