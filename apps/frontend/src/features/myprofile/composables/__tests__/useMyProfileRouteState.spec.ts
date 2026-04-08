import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

const mockRouteName = ref<string>('Me')
const mockRouteParams = ref<Record<string, string>>({})

vi.mock('vue-router', () => ({
  useRoute: () => ({
    get name() {
      return mockRouteName.value
    },
    get params() {
      return mockRouteParams.value
    },
  }),
}))

import { useMyProfileRouteState } from '../useMyProfileRouteState'

describe('useMyProfileRouteState', () => {
  it.each([
    ['Me', 'myprofile'],
    ['MePosts', 'myposts'],
    ['MeCreatePost', 'editpost'],
    ['MeEditPost', 'editpost'],
    ['MeSettings', 'settings'],
    ['MeDating', 'datingprefs'],
    ['MeDatingWizard', 'datingwizard'],
  ])('route %s → subView %s', (route, expected) => {
    mockRouteName.value = route
    const { subView } = useMyProfileRouteState()
    expect(subView.value).toBe(expected)
  })

  it('isActive is true for all my-profile routes', () => {
    for (const name of [
      'Me',
      'MePosts',
      'MeCreatePost',
      'MeEditPost',
      'MeSettings',
      'MeDating',
      'MeDatingWizard',
    ]) {
      mockRouteName.value = name
      const { isActive } = useMyProfileRouteState()
      expect(isActive.value).toBe(true)
    }
  })

  it('isActive is false for non-profile routes', () => {
    mockRouteName.value = 'Inbox'
    const { isActive } = useMyProfileRouteState()
    expect(isActive.value).toBe(false)
  })

  it('editingPostId returns postId param on MeEditPost', () => {
    mockRouteName.value = 'MeEditPost'
    mockRouteParams.value = { postId: 'post-42' }
    const { editingPostId } = useMyProfileRouteState()
    expect(editingPostId.value).toBe('post-42')
  })

  it('editingPostId returns undefined on other routes', () => {
    mockRouteName.value = 'MePosts'
    mockRouteParams.value = {}
    const { editingPostId } = useMyProfileRouteState()
    expect(editingPostId.value).toBeUndefined()
  })
})
