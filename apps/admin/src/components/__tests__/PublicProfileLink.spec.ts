import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PublicProfileLink from '../PublicProfileLink.vue'

describe('PublicProfileLink', () => {
  it('links to the public profile on the frontend in a new tab', () => {
    const wrapper = mount(PublicProfileLink, { props: { profileId: 'p1' } })
    const link = wrapper.get('[data-testid="view-public-profile"]')
    expect(link.attributes('href')).toBe('https://app.example.org/profile/p1')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
    expect(link.text()).toBe('Profile')
  })
})
