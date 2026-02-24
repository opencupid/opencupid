import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from './pages/DashboardPage.vue'
import UsersPage from './pages/UsersPage.vue'
import ProfilesPage from './pages/ProfilesPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardPage },
    { path: '/users', name: 'users', component: UsersPage },
    { path: '/profiles', name: 'profiles', component: ProfilesPage },
  ],
})
