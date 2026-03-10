import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import type { ProfileSummary } from '@zod/profile/profile.dto'

vi.mock('@/features/images/components/ProfileThumbnail.vue', () => ({
  default: { template: '<span class="thumb-stub" />' },
}))

import ProfileChipList from '../ProfileChipList.vue'

const profiles: ProfileSummary[] = [
  { id: 'p1', publicName: 'Alice', profileImages: [] },
  { id: 'p2', publicName: 'Bob', profileImages: [] },
  { id: 'p3', publicName: 'Charlie', profileImages: [] },
]

describe('ProfileChipList', () => {
  it('renders correct number of list items', () => {
    const wrapper = mount(ProfileChipList, { props: { profiles } })
    const items = wrapper.findAll('.list-group-item')
    expect(items).toHaveLength(3)
  })

  it('displays profile names', () => {
    const wrapper = mount(ProfileChipList, { props: { profiles } })
    const items = wrapper.findAll('.list-group-item')
    expect(items.at(0)?.text()).toContain('Alice')
    expect(items.at(1)?.text()).toContain('Bob')
    expect(items.at(2)?.text()).toContain('Charlie')
  })

  it('emits select:profile with correct profileId on click', async () => {
    const wrapper = mount(ProfileChipList, { props: { profiles } })
    const items = wrapper.findAll('.list-group-item')
    await items.at(1)!.trigger('click')

    const emitted = wrapper.emitted('select:profile')
    expect(emitted).toHaveLength(1)
    expect(emitted?.[0]).toEqual(['p2'])
  })
})
