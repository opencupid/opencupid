import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import { useAuthStore } from '@/features/auth/stores/authStore'
import { bus } from '@/lib/bus'

import DatingWizardView from '@/features/myprofile/views/DatingWizard.vue'
import DatingPrefsView from '@/features/myprofile/views/DatingPrefs.vue'
import BrowseProfiles from '@/features/browse/views/BrowseProfiles.vue'
import PublicProfileView from '@/features/publicprofile/views/PublicProfileView.vue'
import OnboardingView from '@/features/onboarding/views/Onboarding.vue'
import LoginView from '@/features/auth/views/LoginView.vue'
import MagicLink from '@/features/auth/views/MagicLink.vue'
import LogoutView from '@/features/auth/views/LogoutView.vue'
import EditPostView from '@/features/posts/views/EditPost.vue'

const routes: Array<RouteRecordRaw> = [
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
    path: '/auth/logout',
    name: 'Logout',
    component: LogoutView,
    meta: { requiresAuth: true },
  },
  {
    path: '/browse',
    name: 'BrowseProfiles',
    component: BrowseProfiles,
    meta: { requiresAuth: true },
  },
  {
    path: '/profile/:profileId',
    name: 'PublicProfile',
    component: PublicProfileView,
    props: true,
    meta: { requiresAuth: true, hideNavbar: true },
  },
  {
    path: '/me',
    redirect: () => ({ path: '/browse', query: { panel: 'profile' } }),
  },
  {
    path: '/me/dating-wizard',
    name: 'DatingWizard',
    component: DatingWizardView,
    meta: { requiresAuth: true, hideNavbar: true },
  },
  {
    path: '/me/dating-prefs',
    name: 'DatingPrefs',
    component: DatingPrefsView,
    meta: { requiresAuth: true, hideNavbar: true },
  },
  {
    path: '/me/edit',
    redirect: () => ({ path: '/browse', query: { panel: 'profile' } }),
  },
  {
    path: '/home',
    redirect: '/browse',
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: OnboardingView,
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    redirect: () => ({ path: '/browse', query: { panel: 'profile' } }),
  },
  {
    path: '/inbox',
    redirect: () => ({ path: '/browse', query: { panel: 'inbox' } }),
  },
  {
    path: '/inbox/:conversationId',
    redirect: (to) => ({
      path: '/browse',
      query: { panel: 'inbox', conversation: to.params.conversationId as string },
    }),
  },
  {
    path: '/posts',
    redirect: '/browse',
  },
  {
    path: '/posts/new',
    name: 'CreatePost',
    component: EditPostView,
    meta: { requiresAuth: true, hideNavbar: true },
  },
  {
    path: '/posts/:postId/edit',
    name: 'EditPost',
    component: EditPostView,
    props: true,
    meta: { requiresAuth: true, hideNavbar: true },
  },
  {
    path: '/',
    redirect: '/browse',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Register the navigation guard
router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  // if route requires authentication and the user is not logged in, redirect to login
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return { name: 'Login' }
  }

  // user is logged in and tries to access the login page, redirect to browse
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
