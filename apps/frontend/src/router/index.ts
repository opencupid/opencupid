import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import { useAuthStore } from '@/features/auth/stores/authStore'

import MessagingView from '@/features/messaging/views/Messaging.vue'
import UserHome from '@/features/userhome/views/UserHome.vue'
import Settings from '@/features/settings/views/Settings.vue'
import MyProfile from '@/features/myprofile/views/MyProfile.vue'
import BrowseProfiles from '@/features/browse/views/BrowseProfiles.vue'
import PublicProfileView from '@/features/publicprofile/views/PublicProfileView.vue'
import OnboardingView from '@/features/onboarding/views/Onboarding.vue'
import LoginView from '@/features/auth/views/LoginView.vue'
import MagicLink from '@/features/auth/views/MagicLink.vue'
import LogoutView from '@/features/auth/views/LogoutView.vue'
import PostsView from '@/features/posts/views/Posts.vue'

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
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/profile/:profileId',
    name: 'PublicProfile',
    component: PublicProfileView,
    props: true,
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/me',
    name: 'MyProfile',
    component: MyProfile,
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/me/edit',
    name: 'EditProfile',
    component: MyProfile,
    props: { editMode: true },
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/home',
    name: 'UserHome',
    component: UserHome,
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: OnboardingView,
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/inbox/:conversationId?',
    name: 'Messaging',
    component: MessagingView,
    props: true,
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/posts',
    name: 'Posts',
    component: PostsView,
    props: true,
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/',
    redirect: { name: 'UserHome' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Register the navigation guard
router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return { name: 'Login' }
  }

  if (!to.meta.requiresAuth && authStore.isLoggedIn) {
    return { name: 'UserHome' }
  }

  if (authStore.isLoggedIn) {
    if (to.meta.requiresOnboarding && !authStore.isOnboarded) {
      return { name: 'Onboarding' }
    }
    if (to.name === 'Onboarding' && authStore.isOnboarded) {
      return { name: 'UserHome' }
    }
  }
})

import { setPreviousUrl } from './history'

router.afterEach((to, from) => {
  setPreviousUrl(from.fullPath)
})

export { getPreviousUrl } from './history'

export default router
