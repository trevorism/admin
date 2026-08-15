import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuestic } from 'vuestic-ui'
import AdminPage from '../src/components/AdminPage.vue'
import { getWhoami } from '../src/utils/whoamiApi'

vi.mock('../src/utils/whoamiApi', () => ({ getWhoami: vi.fn() }))
vi.mock('../src/utils/userApi', () => ({
  listUsers: vi.fn(() => Promise.resolve([])),
  approveUser: vi.fn(),
  deactivateUser: vi.fn(),
  updateUserPermissions: vi.fn(),
  deleteUser: vi.fn()
}))
vi.mock('../src/utils/appApi', () => ({
  listApps: vi.fn(() => Promise.resolve([])),
  registerApp: vi.fn(),
  rotateAppSecret: vi.fn(),
  deleteApp: vi.fn()
}))
vi.mock('../src/utils/tenantApi', () => ({
  listTenants: vi.fn(() => Promise.resolve([])),
  getMyTenant: vi.fn(() => Promise.resolve(null)),
  createTenant: vi.fn()
}))

globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

let warnings = []

const globalOptions = {
  plugins: [createVuestic()],
  stubs: { 'router-link': { template: '<a><slot /></a>' } },
  mocks: { $router: { push: vi.fn() }, $route: { name: 'Users' } }
}

function identity(overrides) {
  return {
    username: 'root',
    role: 'admin',
    tenant: null,
    globalAdmin: false,
    tenantAdmin: false,
    canAdminister: true,
    canManageTenants: false,
    ...overrides
  }
}

async function renderCleanly(tab, whoami) {
  getWhoami.mockResolvedValue(whoami)
  const wrapper = mount(AdminPage, { props: { tab }, global: globalOptions })
  await flushPromises()
  const unresolved = warnings.filter((warning) => warning.includes('Failed to resolve component'))
  expect(unresolved).toEqual([])
  return wrapper
}

describe('AdminPage renders against real Vuestic', () => {
  beforeEach(() => {
    warnings = []
    vi.spyOn(console, 'warn').mockImplementation((...args) => warnings.push(args.join(' ')))
    getWhoami.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the users tab for a global admin', async () => {
    await renderCleanly('users', identity({ globalAdmin: true, canManageTenants: true }))
  })

  it('renders the apps tab for a global admin', async () => {
    await renderCleanly('apps', identity({ globalAdmin: true, canManageTenants: true }))
  })

  it('renders the tenants tab for a global admin', async () => {
    await renderCleanly('tenants', identity({ globalAdmin: true, canManageTenants: true }))
  })

  it('renders the tenant tab for a tenant admin', async () => {
    await renderCleanly('tenants', identity({ tenantAdmin: true, tenant: 'g1', role: 'tenant_admin' }))
  })

  it('renders the denial for a plain user', async () => {
    await renderCleanly('users', identity({ canAdminister: false, role: 'user' }))
  })
})
