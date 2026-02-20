import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import { useAuthStore } from '@/features/auth/stores/authStore'

import MessagingView from '@/features/messaging/views/Messaging.vue'
import UserHome from '@/features/userhome/views/UserHome.vue'
import Settings from '@/features/settings/views/Settings.vue'
import MyProfile from '@/features/myprofile/views/MyProfile.vue'
import BrowseProfiles from '@/features/browse/views/BrowseProfiles.vue'
import OnboardingView from '@/features/onboarding/views/Onboarding.vue'
import MatchesView from '@/features/interaction/views/Matches.vue'
import AuthUserId from '@/features/auth/views/AuthUserId.vue'
import AuthOtp from '@/features/auth/views/AuthOtp.vue'
import Logout from '@/features/auth/views/Logout.vue'
import PostsView from '@/features/posts/views/Posts.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/auth',
    name: 'Login',
    // component: () => import('@/features/auth/views/AuthUserId.vue'),
    component: AuthUserId,
    meta: { requiresAuth: false },
  },
  {
    path: '/auth/otp',
    name: 'LoginOTP',
    // component: () => import('@/features/auth/views/AuthOtp.vue'),
    component: AuthOtp,
    meta: { requiresAuth: false },
  },
  {
    path: '/auth/logout',
    name: 'Logout',
    component: Logout,
    meta: { requiresAuth: true },
  },
  {
    path: '/browse',
    name: 'BrowseProfiles',
    component: BrowseProfiles,
    meta: { requiresAuth: true },
  },
  {
    path: '/browse/:scope',
    name: 'BrowseProfilesScope',
    component: BrowseProfiles,
    props: true,
    meta: { requiresAuth: true },
  },
  {
    path: '/profile/:profileId',
    name: 'PublicProfile',
    component: BrowseProfiles,
    props: true,
    meta: { requiresAuth: true },
  },
  {
    path: '/me',
    name: 'MyProfile',
    component: MyProfile,
    meta: { requiresAuth: true },
  },
  {
    path: '/me/edit',
    name: 'EditProfile',
    component: MyProfile,
    props: { editMode: true },
    meta: { requiresAuth: true },
  },
  {
    path: '/home',
    name: 'UserHome',
    component: UserHome,
    meta: { requiresAuth: true },
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
    meta: { requiresAuth: true },
  },
  {
    path: '/inbox/:conversationId?',
    name: 'Messaging',
    component: MessagingView,
    props: true,
    meta: { requiresAuth: true },
  },
  {
    path: '/matches/:profileId?',
    name: 'Matches',
    component: MatchesView,
    props: true,
    meta: { requiresAuth: true },
  },
  {
    path: '/posts',
    name: 'Posts',
    component: PostsView,
    props: true,
    meta: { requiresAuth: true },
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
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // if route requires authentication and the user is not logged in, redirect to login
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return next({ name: 'Login' })
  }

  // user is logged in and tries to access the login page, redirect to UserHome
  if (!to.meta.requiresAuth && authStore.isLoggedIn) {
    return next({ name: 'UserHome' })
  }

  next()
})

let previousUrl: string = '/browse'

router.afterEach((to, from) => {
  previousUrl = from.fullPath
})

export function getPreviousUrl(): string {
  return previousUrl
}

export default router
