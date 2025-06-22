import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
// import useToast from 'vue-toastification'

import { useAuthStore } from '@/store/authStore'
import { useLocalStore } from '@/store/localStore'

import AuthUserId from '@/views/AuthUserId.vue'
import AuthOtp from '@/views/AuthOtp.vue'
import UserHome from '@/views/UserHome.vue'
import Settings from '@/views/Settings.vue'
import MyProfile from '@/views/MyProfile.vue'
import Messaging from '@/views/Messaging.vue'
import PublicProfile from '@/views/PublicProfile.vue'
import BrowseProfiles from '@/views/BrowseProfiles.vue'
import OnboardWizard from '@/views/OnboardWizard.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/auth',
    name: 'Login',
    component: AuthUserId,
    meta: { requiresAuth: false },
  },
  {
    path: '/auth/otp',
    name: 'LoginOTP',
    component: AuthOtp,
    meta: { requiresAuth: false },
  },
  {
    path: '/profile/:id',
    name: 'PublicProfile',
    component: PublicProfile,
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
    path: '/',
    name: 'UserHome',
    component: UserHome,
    meta: { requiresAuth: true },
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: OnboardWizard,
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { requiresAuth: true },
  },
  {
    path: '/browse',
    name: 'BrowseProfiles',
    component: BrowseProfiles,
    meta: { requiresAuth: true },
  },
  {
    path: '/inbox/:conversationId?',
    name: 'Messaging',
    component: Messaging,
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

  // Initialize auth state if not already done
  if (!authStore.isInitialized) {
    await authStore.initializeFromStorage()
  }

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

// const toast = useToast()

router.afterEach((to, from) => {
  const localStore = useLocalStore()
  // const flashMessage = localStore.getFlashMessage()

  // if (flashMessage) {
  // toast(flashMessage)
  // }

  // Set the page title based on the route name
  // const title = to.name ? `${to.name} - My App` : 'My App';
  // document.title = title;
})

export default router
