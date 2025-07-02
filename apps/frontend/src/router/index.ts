import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import { useAuthStore } from '@/features/auth/stores/authStore'

import MessagingView from '@/features/messaging/views/Messaging.vue'
import UserHome from '@/views/UserHome.vue'
import Settings from '@/features/settings/views/Settings.vue'
import MyProfile from '@/features/myprofile/views/MyProfile.vue'
import BrowseProfiles from '@/features/browse/views/BrowseProfiles.vue'
import OnboardingView from '@/features/onboarding/views/Onboarding.vue'
import MatchesView from '@/features/interaction/views/Matches.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/auth',
    name: 'Login',
    component: () => import('@/features/auth/views/AuthUserId.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/auth/otp',
    name: 'LoginOTP',
    component: () => import('@/features/auth/views/AuthOtp.vue'),
    meta: { requiresAuth: false },
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
    path: '/',
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
  // Redirect root to login page
  {
    path: '/',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Register the navigation guard
router.beforeEach(async (to, from, next) => {

  const authStore = useAuthStore()

  if (to.meta.requiresAuth === false && authStore.isLoggedIn) {
    return next({ name: 'UserHome' })
  }

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    // If the route requires authentication and the user is not logged in, redirect to login
    return next({ name: 'Login' })
  } else {
    // Otherwise, allow access
    next()
  }
})


router.afterEach((to, from) => {

})

export default router
