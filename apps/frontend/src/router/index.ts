import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import { useAuthStore } from '@/features/auth/stores/authStore'
import { bus } from '@/lib/bus'

import OnboardingLayout from '@/features/app/views/OnboardingLayout.vue'
// LoginView stays eager so the form renders on first paint without a chunk
// fetch — this is the primary unauthenticated entry point.
import LoginView from '@/features/auth/views/LoginView.vue'
import MagicLink from '@/features/auth/views/MagicLink.vue'

// Route components are lazy-loaded for bundle splitting. AppShellLayout in
// particular is the gateway to the entire authenticated feature surface
// (it transitively imports OwnerDrawerOrchestrator → ProfilePanel +
// InboxPanel → ~240 KB gz of feature code), so lazy-loading it keeps that
// subgraph out of the pre-auth bundle.
//
// Race-safety: verifyToken does not await bootstrap directly — bootstrap
// is orchestrated by lib/auth.ts via the auth:login bus event. The
// post-login navigator (MagicLink.vue.onMounted) awaits bootstrapReady()
// from lib/auth before calling router.push, so authenticated route
// components mount with profile state already loaded.
const AppShellLayout = () => import('@/features/app/views/AppShellLayout.vue')
const AppShell = () => import('@/features/browse/views/BrowseProfiles.vue')
const OnboardingView = () => import('@/features/onboarding/views/Onboarding.vue')
const UnsubscribeView = () => import('@/features/unsubscribe/views/UnsubscribeView.vue')

// All browse-area routes render AppShell. KeepAlive (include: ['AppShell'])
// in AppShellLayout keeps it mounted across navigations. AppShell reads the
// route via area orchestrator composables — no <RouterView> in its template.
const browseRoute = (path: string, name: string): RouteRecordRaw => ({
  path,
  name,
  component: AppShell,
})

const routes: Array<RouteRecordRaw> = [
  // ── Unauthenticated routes ────────────────────────────────────────────
  {
    path: '/auth',
    name: 'Login',
    component: LoginView,
    meta: { requiresAuth: false },
  },
  {
    path: '/magic-link',
    name: 'MagicLink',
    component: MagicLink,
    meta: { requiresAuth: false },
  },
  {
    path: '/unsubscribe/:token',
    name: 'Unsubscribe',
    component: UnsubscribeView,
    meta: { requiresAuth: false },
  },

  // ── Onboarding shell ──────────────────────────────────────────────────
  // Top-level sibling of '/' (NOT a child) so that navigating between
  // /onboarding and /browse causes the other layout to unmount. This is
  // how we guarantee that AppShell's KeepAlive cache cannot survive across
  // the onboarding boundary: when a fresh-registration user is redirected
  // from BrowseProfiles.onMounted → /onboarding, AppShellLayout unmounts and
  // takes the cached (broken-state) AppShell with it. On completion →
  // /browse, OnboardingLayout unmounts and a fresh AppShellLayout mounts.
  {
    path: '/onboarding',
    component: OnboardingLayout,
    meta: { requiresAuth: true },
    children: [{ path: '', name: 'Onboarding', component: OnboardingView }],
  },

  // ── Authenticated shell ───────────────────────────────────────────────
  {
    path: '/',
    component: AppShellLayout,
    meta: { requiresAuth: true },
    children: [
      // Default landing route — redirect bare '/' to Browse
      { path: '', redirect: { name: 'Browse' } },

      // Browse area — all render AppShell, KeepAlive keeps it mounted
      browseRoute('browse', 'Browse'),

      // Detail panel area (drives DetailPanelOrchestrator via useDetailPanel)
      browseRoute('profile/:profileId', 'PublicProfile'),
      browseRoute('posts/:postId', 'PublicPost'),
      browseRoute('events/:eventId', 'PublicEvent'),
      browseRoute('communities/:communityId', 'PublicCommunity'),

      // My profile area (drives drawer → ProfilePanel sub-views)
      browseRoute('me', 'Me'),
      browseRoute('me/posts', 'MePosts'),
      browseRoute('me/posts/new', 'MeCreatePost'),
      browseRoute('me/posts/:postId/edit', 'MeEditPost'),
      browseRoute('me/events/new', 'MeCreateEvent'),
      browseRoute('me/events/:eventId/edit', 'MeEditEvent'),
      browseRoute('me/communities/new', 'MeCreateCommunity'),
      browseRoute('me/communities/:communityId/edit', 'MeEditCommunity'),
      browseRoute('me/settings', 'MeSettings'),
      browseRoute('me/dating', 'MeDating'),
      browseRoute('me/dating/wizard', 'MeDatingWizard'),

      // Inbox area (drives drawer → InboxPanel sub-views)
      browseRoute('inbox', 'Inbox'),
      browseRoute('inbox/:conversationId', 'Conversation'),
      browseRoute('inbox/new/:profileId', 'ConversationNew'),
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return { name: 'Login' }
  }

  if (!to.meta.requiresAuth && authStore.isLoggedIn && to.name !== 'Unsubscribe') {
    return { name: 'Browse' }
  }
})

import { setPreviousUrl } from './history'

router.afterEach((to, from) => {
  setPreviousUrl(from.fullPath)
})

export { getPreviousUrl } from './history'

bus.on('auth:logged-out', () => {
  router.push({ name: 'Login' })
})

export default router
