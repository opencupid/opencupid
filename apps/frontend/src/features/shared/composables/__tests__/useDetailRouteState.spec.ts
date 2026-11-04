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

import { useDetailRouteState, detailRoute } from '../useDetailRouteState'

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

  it('detail returns event type with id on PublicEvent route', () => {
    mockRouteName.value = 'PublicEvent'
    mockRouteParams.value = { eventId: 'evt-7' }
    const { detail } = useDetailRouteState()
    expect(detail.value).toEqual({ type: 'event', id: 'evt-7' })
  })

  it('detail returns community type with id on PublicCommunity route', () => {
    mockRouteName.value = 'PublicCommunity'
    mockRouteParams.value = { communityId: 'c-abc' }
    const { detail } = useDetailRouteState()
    expect(detail.value).toEqual({ type: 'community', id: 'c-abc' })
  })
  it('isGridOpen is false over the map', () => {
    mockRouteName.value = 'PublicProfile'
    mockRouteParams.value = { profileId: 'prof-42' }
    const { isGridOpen } = useDetailRouteState()
    expect(isGridOpen.value).toBe(false)
  })

  it('isGridOpen is true on the grid route, with no detail', () => {
    mockRouteName.value = 'BrowseGrid'
    mockRouteParams.value = {}
    const { detail, isGridOpen } = useDetailRouteState()
    expect(isGridOpen.value).toBe(true)
    expect(detail.value).toBeNull()
  })

  it.each([
    ['GridProfile', 'profileId', 'profile'],
    ['GridPost', 'postId', 'post'],
    ['GridEvent', 'eventId', 'event'],
    ['GridCommunity', 'communityId', 'community'],
  ])('%s route opens a %s detail over the grid', (name, param, type) => {
    mockRouteName.value = name
    mockRouteParams.value = { [param]: 'id-1' }
    const { detail, isGridOpen } = useDetailRouteState()
    expect(detail.value).toEqual({ type, id: 'id-1' })
    expect(isGridOpen.value).toBe(true)
  })
})

describe('detailRoute', () => {
  it('builds the map route for a detail', () => {
    expect(detailRoute('event', 'e1', false)).toEqual({
      name: 'PublicEvent',
      params: { eventId: 'e1' },
    })
  })

  it('builds the grid route for a detail', () => {
    expect(detailRoute('profile', 'p1', true)).toEqual({
      name: 'GridProfile',
      params: { profileId: 'p1' },
    })
  })
})
