import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TenantsTab from '../src/components/TenantsTab.vue'
import { createTenant, getMyTenant, listTenants } from '../src/utils/tenantApi'
import { stubs } from './stubs'

vi.mock('../src/utils/tenantApi', () => ({
  listTenants: vi.fn(),
  getMyTenant: vi.fn(),
  createTenant: vi.fn()
}))

const globalAdmin = { username: 'root', globalAdmin: true, tenantAdmin: false, tenant: null, canAdminister: true }
const tenantAdmin = { username: 'alice', globalAdmin: false, tenantAdmin: true, tenant: 'g1', canAdminister: true }

async function mountTab(identity) {
  const wrapper = mount(TenantsTab, { props: { whoami: identity }, global: { stubs } })
  await flushPromises()
  return wrapper
}

function buttonWithText(wrapper, text) {
  return wrapper.findAll('button').find((button) => button.text().includes(text))
}

describe('TenantsTab as a global admin', () => {
  beforeEach(() => {
    listTenants.mockReset().mockResolvedValue([{ id: '1', name: 'Acme', domain: 'acme.com', guid: 'g1' }])
    getMyTenant.mockReset()
    createTenant.mockReset().mockResolvedValue({ id: '2', name: 'New', domain: '', guid: 'g2' })
  })

  it('lists every tenant', async () => {
    const wrapper = await mountTab(globalAdmin)

    expect(listTenants).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Acme')
  })

  it('offers creation', async () => {
    const wrapper = await mountTab(globalAdmin)
    expect(buttonWithText(wrapper, 'Create tenant')).toBeTruthy()
  })

  // Deleting a tenant orphans its users and apps with no way to recover the guid,
  // so the action is deliberately absent rather than guarded.
  it('does not offer deletion', async () => {
    const wrapper = await mountTab(globalAdmin)

    expect(buttonWithText(wrapper, 'Delete')).toBeFalsy()
    expect(wrapper.text()).toContain('Tenant deletion is intentionally not offered')
  })

  it('creates a tenant and reloads', async () => {
    const wrapper = await mountTab(globalAdmin)

    wrapper.vm.createForm = { name: 'New', domain: 'new.com' }
    await wrapper.vm.submitCreate()
    await flushPromises()

    expect(createTenant).toHaveBeenCalledWith({ name: 'New', domain: 'new.com' })
    expect(listTenants).toHaveBeenCalledTimes(2)
  })

  it('reports a missing name', async () => {
    createTenant.mockRejectedValue(new Error('tenant_name_required'))
    const wrapper = await mountTab(globalAdmin)

    wrapper.vm.createForm = { name: '', domain: '' }
    await wrapper.vm.submitCreate()
    await flushPromises()

    expect(wrapper.vm.error).toBe('A tenant name is required.')
  })
})

describe('TenantsTab as a tenant admin', () => {
  beforeEach(() => {
    listTenants.mockReset()
    getMyTenant.mockReset().mockResolvedValue({ id: '1', name: 'Acme', domain: 'acme.com', guid: 'g1' })
    createTenant.mockReset()
  })

  it('reads only their own tenant', async () => {
    const wrapper = await mountTab(tenantAdmin)

    expect(getMyTenant).toHaveBeenCalled()
    expect(listTenants).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Acme')
  })

  it('is read only', async () => {
    const wrapper = await mountTab(tenantAdmin)

    expect(buttonWithText(wrapper, 'Create tenant')).toBeFalsy()
    expect(buttonWithText(wrapper, 'Delete')).toBeFalsy()
  })

  it('explains when they belong to no tenant', async () => {
    getMyTenant.mockResolvedValue(null)
    const wrapper = await mountTab(tenantAdmin)

    expect(wrapper.text()).toContain('not a member of a tenant')
  })

  it('surfaces a load failure', async () => {
    getMyTenant.mockRejectedValue({ response: { data: { error: 'Forbidden' } } })
    const wrapper = await mountTab(tenantAdmin)

    expect(wrapper.text()).toContain('Forbidden')
  })
})
