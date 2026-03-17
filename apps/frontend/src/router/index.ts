import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import { useAuthStore } from '@/features/auth/stores/authStore'

// Eager: most common entry points — no extra round-trip on first load
import UserHome from '@/features/userhome/views/UserHome.vue'
import LoginView from '@/features/auth/views/LoginView.vue'

// Lazy: each route becomes a separate chunk, loaded on navigation
const MessagingView = () => import('@/features/messaging/views/Messaging.vue')
const ConversationView = () => import('@/features/messaging/views/ConversationView.vue')
const Settings = () => import('@/features/settings/views/Settings.vue')
const MyProfile = () => import('@/features/myprofile/views/MyProfile.vue')
const DatingWizardView = () => import('@/features/myprofile/views/DatingWizard.vue')
const DatingPrefsView = () => import('@/features/myprofile/views/DatingPrefs.vue')
const BrowseProfiles = () => import('@/features/browse/views/BrowseProfiles.vue')
const PublicProfileView = () => import('@/features/publicprofile/views/PublicProfileView.vue')
const OnboardingView = () => import('@/features/onboarding/views/Onboarding.vue')
const MagicLink = () => import('@/features/auth/views/MagicLink.vue')
const LogoutView = () => import('@/features/auth/views/LogoutView.vue')
const BrowsePostsView = () => import('@/features/posts/views/BrowsePosts.vue')
const EditPostView = () => import('@/features/posts/views/EditPost.vue')

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
    name: 'MyProfile',
    component: MyProfile,
    meta: { requiresAuth: true },
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
    name: 'EditProfile',
    component: MyProfile,
    props: { editMode: true },
    meta: { requiresAuth: true, hideNavbar: true },
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
    meta: { requiresAuth: true, hideNavbar: true },
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
