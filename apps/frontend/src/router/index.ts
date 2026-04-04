import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import { useAuthStore } from '@/features/auth/stores/authStore'
import { bus } from '@/lib/bus'

import AuthLayout from '@/features/app/views/AuthLayout.vue'
import DatingWizardView from '@/features/myprofile/views/DatingWizard.vue'
import DatingPrefsView from '@/features/myprofile/views/DatingPrefs.vue'
import BrowseProfiles from '@/features/browse/views/BrowseProfiles.vue'
import OnboardingView from '@/features/onboarding/views/Onboarding.vue'
import LoginView from '@/features/auth/views/LoginView.vue'
import MagicLink from '@/features/auth/views/MagicLink.vue'
import LogoutView from '@/features/auth/views/LogoutView.vue'
import EditPostView from '@/features/posts/views/EditPost.vue'

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
        name: 'BrowseProfiles',
        component: BrowseProfiles,
      },
      {
        path: 'auth/logout',
        name: 'Logout',
        component: LogoutView,
      },
      {
        path: 'onboarding',
        name: 'Onboarding',
        component: OnboardingView,
      },
      {
        path: 'me/dating-wizard',
        name: 'DatingWizard',
        component: DatingWizardView,
      },
      {
        path: 'me/dating-prefs',
        name: 'DatingPrefs',
        component: DatingPrefsView,
      },
      {
        path: 'posts/new',
        name: 'CreatePost',
        component: EditPostView,
      },
      {
        path: 'posts/:postId/edit',
        name: 'EditPost',
        component: EditPostView,
        props: true,
      },
    ],
  },

  // ── Redirects ────────────────────────────────────────────────────────
  { path: '/me', redirect: () => ({ path: '/browse', query: { panel: 'profile' } }) },
  { path: '/me/edit', redirect: () => ({ path: '/browse', query: { panel: 'profile' } }) },
  { path: '/settings', redirect: () => ({ path: '/browse', query: { panel: 'profile' } }) },
  { path: '/inbox', redirect: () => ({ path: '/browse', query: { panel: 'inbox' } }) },
  {
    path: '/inbox/:conversationId',
    redirect: (to) => ({
      path: '/browse',
      query: { panel: 'inbox', conversation: to.params.conversationId as string },
    }),
  },
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
