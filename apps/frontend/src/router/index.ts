import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import { useAuthStore } from '@/features/auth/stores/authStore'
import { bus } from '@/lib/bus'

import AuthLayout from '@/features/app/views/AuthLayout.vue'
import BrowseProfiles from '@/features/browse/views/BrowseProfiles.vue'
import OnboardingView from '@/features/onboarding/views/Onboarding.vue'
import LoginView from '@/features/auth/views/LoginView.vue'
import MagicLink from '@/features/auth/views/MagicLink.vue'

const routes: Array<RouteRecordRaw> = [
  // ── Unauthenticated routes ───────────────────────────────────────────
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

  // ── Authenticated routes (app shell) ────────────────────────────────
  {
    path: '/',
    component: AuthLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: 'browse',
        name: 'Browse',
        component: BrowseProfiles,
      },
      {
        path: 'me',
        name: 'Me',
        component: BrowseProfiles,
      },
      {
        path: 'inbox',
        name: 'Inbox',
        component: BrowseProfiles,
      },
      {
        path: 'inbox/:conversationId',
        name: 'Conversation',
        component: BrowseProfiles,
      },
      {
        path: 'profile/:profileId',
        name: 'PublicProfile',
        component: BrowseProfiles,
        props: true,
      },
      {
        path: 'onboarding',
        name: 'Onboarding',
        component: OnboardingView,
      },
    ],
  },

  // ── Redirects ────────────────────────────────────────────────────────
  { path: '/me/edit', redirect: () => ({ name: 'Me' }) },
  { path: '/settings', redirect: () => ({ name: 'Me' }) },
  { path: '/posts', redirect: '/browse' },
  { path: '/home', redirect: '/browse' },
  { path: '/', redirect: '/browse' },
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

  if (!to.meta.requiresAuth && authStore.isLoggedIn) {
    return { path: '/browse' }
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
