import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

vi.mock('@/features/auth/stores/authStore', () => ({
  useAuthStore: () => ({ profileId: 'profile-1' }),
}))
vi.mock('@/features/publicprofile/components/SendMessageDialog.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/assets/icons/interface/hide.svg', () => ({ default: { template: '<span />' } }))
vi.mock('@/assets/icons/interface/unhide.svg', () => ({ default: { template: '<span />' } }))
vi.mock('@/assets/icons/interface/delete.svg', () => ({ default: { template: '<span />' } }))
vi.mock('@/assets/icons/interface/pencil-2.svg', () => ({ default: { template: '<span />' } }))
vi.mock('@/assets/icons/interface/message.svg', () => ({ default: { template: '<span />' } }))

import PostCard from '../PostCard.vue'

const stubs = {
  PostIt: { template: '<div><slot name="header" /><slot /></div>' },
  PostTypeBadge: { template: '<div />' },
  LocationLabel: { template: '<div />' },
  ProfileThumbnail: { template: '<div />' },
  UseTimeAgo: { template: '<span><slot :timeAgo="\'now\'" /></span>' },
  BButton: {
    props: ['title'],
    template: '<button :title="title" @click="$emit(\'click\')"><slot /></button>',
  },
}

describe('PostCard', () => {
  it('uses Hide title when post is visible', () => {
    const wrapper = mount(PostCard, {
      props: {
        showDetails: false,
        post: {
          id: 'post-1',
          postedById: 'profile-1',
          type: 'OFFER',
          content: 'visible',
          isVisible: true,
          isDeleted: false,
          country: null,
          cityName: null,
          lat: null,
          lon: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      global: {
        stubs,
        mocks: { $t: (k: string) => k },
      },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons[2].attributes('title')).toBe('posts.actions.hide')
  })

  it('uses Show title when post is hidden', () => {
    const wrapper = mount(PostCard, {
      props: {
        showDetails: false,
        post: {
          id: 'post-1',
          postedById: 'profile-1',
          type: 'OFFER',
          content: 'hidden',
          isVisible: false,
          isDeleted: false,
          country: null,
          cityName: null,
          lat: null,
          lon: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      global: {
        stubs,
        mocks: { $t: (k: string) => k },
      },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons[2].attributes('title')).toBe('posts.actions.show')
  })
})
