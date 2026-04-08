import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

const mockRouteName = ref<string>('Browse')
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

import { useDetailRouteState } from '../useDetailRouteState'

describe('useDetailRouteState', () => {
  it('detail is null on Browse route', () => {
    mockRouteName.value = 'Browse'
    mockRouteParams.value = {}
    const { detail } = useDetailRouteState()
    expect(detail.value).toBeNull()
  })

  it('detail is null on Me route', () => {
    mockRouteName.value = 'Me'
    mockRouteParams.value = {}
    const { detail } = useDetailRouteState()
    expect(detail.value).toBeNull()
  })

  it('detail returns profile type with id on PublicProfile route', () => {
    mockRouteName.value = 'PublicProfile'
    mockRouteParams.value = { profileId: 'prof-42' }
    const { detail } = useDetailRouteState()
    expect(detail.value).toEqual({ type: 'profile', id: 'prof-42' })
  })

  it('detail returns post type with id on PublicPost route', () => {
    mockRouteName.value = 'PublicPost'
    mockRouteParams.value = { postId: 'post-99' }
    const { detail } = useDetailRouteState()
    expect(detail.value).toEqual({ type: 'post', id: 'post-99' })
  })
})
