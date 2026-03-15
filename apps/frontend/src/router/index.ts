import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import { useAuthStore } from '@/features/auth/stores/authStore'

import MessagingView from '@/features/messaging/views/Messaging.vue'
import ConversationView from '@/features/messaging/views/ConversationView.vue'
import UserHome from '@/features/userhome/views/UserHome.vue'
import Settings from '@/features/settings/views/Settings.vue'
import MyProfile from '@/features/myprofile/views/MyProfile.vue'
import DatingWizardView from '@/features/myprofile/views/DatingWizard.vue'
import DatingPrefsView from '@/features/myprofile/views/DatingPrefs.vue'
import BrowseProfiles from '@/features/browse/views/BrowseProfiles.vue'
import PublicProfileView from '@/features/publicprofile/views/PublicProfileView.vue'
import OnboardingView from '@/features/onboarding/views/Onboarding.vue'
import LoginView from '@/features/auth/views/LoginView.vue'
import MagicLink from '@/features/auth/views/MagicLink.vue'
import LogoutView from '@/features/auth/views/LogoutView.vue'
import BrowsePostsView from '@/features/posts/views/BrowsePosts.vue'
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
    meta: { requiresAuth: true },
  },
  {
    path: '/me',
    name: 'MyProfile',
    component: MyProfile,
    meta: { requiresAuth: true },
  },
  {
    path: '/me/dating-wizard',
    name: 'DatingWizard',
    component: DatingWizardView,
    meta: { requiresAuth: true },
  },
  {
    path: '/me/dating-prefs',
    name: 'DatingPrefs',
    component: DatingPrefsView,
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
    path: '/inbox',
    name: 'Messaging',
    component: MessagingView,
    meta: { requiresAuth: true },
  },
  {
    path: '/inbox/:conversationId',
    name: 'Conversation',
    component: ConversationView,
    props: true,
    meta: { requiresAuth: true },
  },

  {
    path: '/posts',
    name: 'Posts',
    component: BrowsePostsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/posts/new',
    name: 'CreatePost',
    component: EditPostView,
    meta: { requiresAuth: true },
  },
  {
    path: '/posts/:postId/edit',
    name: 'EditPost',
    component: EditPostView,
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
router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  // if route requires authentication and the user is not logged in, redirect to login
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return { name: 'Login' }
  }

  // user is logged in and tries to access the login page, redirect to UserHome
  if (!to.meta.requiresAuth && authStore.isLoggedIn) {
    return { name: 'UserHome' }
  }
})

import { setPreviousUrl } from './history'

router.afterEach((to, from) => {
  setPreviousUrl(from.fullPath)
})

export { getPreviousUrl } from './history'

export default router
