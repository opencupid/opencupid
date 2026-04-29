import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from './pages/DashboardPage.vue'
import UsersPage from './pages/UsersPage.vue'
import ProfilesPage from './pages/ProfilesPage.vue'
import ModerationPage from './pages/ModerationPage.vue'
import TagsPage from './pages/TagsPage.vue'
import MessagesPage from './pages/MessagesPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardPage },
    { path: '/users', name: 'users', component: UsersPage },
    { path: '/profiles', name: 'profiles', component: ProfilesPage },
    { path: '/moderation', name: 'moderation', component: ModerationPage },
    { path: '/tags', name: 'tags', component: TagsPage },
    { path: '/messages', name: 'messages', component: MessagesPage },
  ],
})
