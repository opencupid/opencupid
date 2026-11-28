import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import MatchPair from '../MatchPair.vue'

describe('MatchPair', () => {
  it('shows both profiles, left then right', () => {
    const wrapper = mount(MatchPair, {
      props: {
        left: { id: 'a', profileImages: [] },
        right: { id: 'b', profileImages: [] },
      },
      global: {
        stubs: {
          ProfileImage: { props: ['profile'], template: '<i :data-id="profile.id" />' },
        },
      },
    })

    expect(wrapper.findAll('i').map((i) => i.attributes('data-id'))).toEqual(['a', 'b'])
  })
})
