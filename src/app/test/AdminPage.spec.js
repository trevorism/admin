import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AdminPage from '../src/components/AdminPage.vue'
import { getWhoami } from '../src/utils/whoamiApi'
import { stubs } from './stubs'

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

function whoami(overrides) {
  return {
    username: 'alice',
    role: 'admin',
    tenant: null,
    globalAdmin: false,
    tenantAdmin: false,
    canAdminister: false,
    canManageTenants: false,
    ...overrides
  }
}

async function mountPage(identity, tab = 'users') {
  getWhoami.mockResolvedValue(identity)
  const wrapper = mount(AdminPage, { props: { tab }, global: { stubs } })
  await flushPromises()
  return wrapper
}

describe('AdminPage', () => {
  beforeEach(() => {
    getWhoami.mockReset()
  })

  it('denies a signed in user who may not administer', async () => {
    const wrapper = await mountPage(whoami({ role: 'user' }))

    expect(wrapper.text()).toContain('tenant and global administrators only')
    expect(wrapper.text()).not.toContain('Applications')
  })

  it('names the tenant tab in the plural for a global admin', async () => {
    const wrapper = await mountPage(whoami({ globalAdmin: true, canAdminister: true, canManageTenants: true }))

    expect(wrapper.text()).toContain('Tenants')
  })

  it('names the tenant tab in the singular for a tenant admin', async () => {
    const wrapper = await mountPage(
      whoami({ tenantAdmin: true, canAdminister: true, tenant: 't1', role: 'tenant_admin' })
    )

    const tabText = wrapper.text()
    expect(tabText).toContain('Tenant')
    expect(tabText).not.toContain('Tenants')
  })

  it('surfaces a failure to confirm access', async () => {
    getWhoami.mockRejectedValue({ response: { data: { error: 'Session expired' } } })
    const wrapper = mount(AdminPage, { props: { tab: 'users' }, global: { stubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Session expired')
  })

  // A stopped API is the most common local failure, and calling it an access
  // problem sends you looking in entirely the wrong place.
  it('says the server is unreachable rather than blaming access', async () => {
    getWhoami.mockRejectedValue({ response: { status: 502, data: '' } })
    const wrapper = mount(AdminPage, { props: { tab: 'users' }, global: { stubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Could not reach the server')
    expect(wrapper.text()).not.toContain('Could not confirm your access')
  })
})
