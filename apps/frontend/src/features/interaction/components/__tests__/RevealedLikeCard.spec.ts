import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RevealedLikeCard from '../RevealedLikeCard.vue'

describe('RevealedLikeCard', () => {
  it('shows the liker as a highlighted map marker with their name', () => {
    const profile = { id: 'p1', publicName: 'Tünde', profileImages: [] } as any
    const wrapper = mount(RevealedLikeCard, {
      props: { profile },
      global: {
        stubs: {
          ProfileMarker: {
            props: { profile: Object, highlighted: Boolean },
            template: '<i class="marker" :data-hl="highlighted" />',
          },
        },
      },
    })
    expect(wrapper.find('.marker').attributes('data-hl')).toBe('true')
    expect(wrapper.text()).toContain('Tünde')
  })
})
