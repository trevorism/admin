import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn, loginUrlFor } from '../utils/auth'
import AdminPage from '../components/AdminPage.vue'

const routes = [
  {
    path: '/',
    name: 'Users',
    component: AdminPage,
    props: () => ({ tab: 'users' }),
    meta: { requiresAuth: true }
  },
  {
    path: '/apps',
    name: 'Apps',
    component: AdminPage,
    props: () => ({ tab: 'apps' }),
    meta: { requiresAuth: true }
  },
  {
    path: '/tenants',
    name: 'Tenants',
    component: AdminPage,
    props: () => ({ tab: 'tenants' }),
    meta: { requiresAuth: true }
  }
]

// Signed-in only. Deliberately not gated on the admin cookie: it cannot tell a
// global admin from a tenant admin, it is forgeable, and it is never re-set by a
// refresh. A signed-in non-administrator must reach AdminPage and see the denial,
// because redirecting them to login would loop on their still-valid session.
function authGuard(to) {
  if (!to.meta?.requiresAuth || isLoggedIn()) {
    return true
  }
  window.location.assign(loginUrlFor(window.location.origin + to.fullPath))
  return false
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(authGuard)

export default router
export { routes, authGuard }
