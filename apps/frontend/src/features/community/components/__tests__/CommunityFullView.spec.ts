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
  location: { country: 'HU', cityName: 'Budapest', lat: null, lon: null },
  postedBy: { id: 'p-1', publicName: 'Alice', profileImages: [] },
}

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
