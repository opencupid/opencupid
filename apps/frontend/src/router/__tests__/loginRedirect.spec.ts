import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { loginRedirect, loginRoute } from '../loginRedirect'

const component = { template: '<div />' }
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/auth', name: 'Login', component, meta: { requiresAuth: false } },
    {
      path: '/',
      component,
      meta: { requiresAuth: true },
      children: [
        { path: 'browse', name: 'Browse', component },
        { path: 'inbox/:conversationId', name: 'Conversation', component },
      ],
    },
  ],
})

describe('loginRoute', () => {
  it('remembers an authenticated deep link, query included', () => {
    expect(loginRoute(router.resolve('/inbox/abc?tab=1'))).toEqual({
      name: 'Login',
      query: { redirect: '/inbox/abc?tab=1' },
    })
  })

  it('does not remember the default landing page', () => {
    expect(loginRoute(router.resolve('/browse'))).toEqual({ name: 'Login', query: {} })
  })

  it('does not remember unauthenticated routes', () => {
    expect(loginRoute(router.resolve('/auth'))).toEqual({ name: 'Login', query: {} })
  })
})

describe('loginRedirect', () => {
  it('accepts an in-app path to an authenticated route', () => {
    expect(loginRedirect(router, '/inbox/abc?tab=1')).toBe('/inbox/abc?tab=1')
  })

  it.each([
    ['a missing value', undefined],
    ['a repeated query param', ['/inbox/abc', '/browse']],
    ['a protocol-relative URL', '//evil.example'],
    ['a backslash variant', '/\\evil.example'],
    ['an absolute URL', 'https://evil.example/inbox/abc'],
    ['an unauthenticated route', '/auth'],
    ['an unknown route', '/no-such-page'],
  ])('rejects %s', (_label, raw) => {
    expect(loginRedirect(router, raw)).toBeUndefined()
  })
})
