import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/features/auth/stores/authStore', () => ({
  useAuthStore: () => ({ refreshMediaToken: vi.fn().mockResolvedValue(undefined) }),
}))

import ProfileImageComponent from '../components/ImageTag.vue'

describe('ProfileImageComponent', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders picture sources', () => {
    const img = { variants: [{ size: 'card', url: '/img/one-card.webp' }], altText: 'test' } as any
    const wrapper = mount(ProfileImageComponent, { props: { image: img } })
    expect(wrapper.find('img').attributes('src')).toContain('/img/one-card.webp')
    expect(wrapper.html()).toContain('webp')
  })
})
