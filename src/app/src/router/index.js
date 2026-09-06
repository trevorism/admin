import { createRouter, createWebHistory } from 'vue-router'
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

// Signed-in only, which is all the guard from @trevorism/ui-auth does. Deliberately
// not gated on being an administrator: that cannot tell a global admin from a tenant
// admin, and a signed-in non-administrator must reach AdminPage and see the denial,
// because redirecting them to login would loop on their still-valid session.
// Authorization comes from /api/whoami and the signed token behind it.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
export { routes }
