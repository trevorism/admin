import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import UsersTab from '../src/components/UsersTab.vue'
import {
  approveUser,
  deactivateUser,
  deleteUser,
  listUsers,
  updateUserPermissions
} from '../src/utils/userApi'
import { stubs } from './stubs'

vi.mock('../src/utils/userApi', () => ({
  listUsers: vi.fn(),
  approveUser: vi.fn(),
  deactivateUser: vi.fn(),
  updateUserPermissions: vi.fn(),
  deleteUser: vi.fn()
}))

function user(overrides) {
  return {
    id: '1',
    username: 'alice',
    email: 'alice@trevorism.com',
    admin: false,
    active: true,
    permissions: 'CR',
    tenant: '',
    dateCreated: null,
    dateExpired: null,
    ...overrides
  }
}

function whoami(overrides) {
  return { username: 'root', globalAdmin: true, tenantAdmin: false, tenant: null, canAdminister: true, ...overrides }
}

async function mountTab(users, identity = whoami()) {
  listUsers.mockResolvedValue(users)
  const wrapper = mount(UsersTab, { props: { whoami: identity }, global: { stubs } })
  await flushPromises()
  return wrapper
}

function buttonWithText(wrapper, text) {
  return wrapper.findAll('button').find((button) => button.text().includes(text))
}

describe('UsersTab', () => {
  beforeEach(() => {
    listUsers.mockReset()
    approveUser.mockReset().mockResolvedValue()
    deactivateUser.mockReset().mockResolvedValue()
    updateUserPermissions.mockReset().mockResolvedValue()
    deleteUser.mockReset().mockResolvedValue()
  })

  it('lists the users it loaded', async () => {
    const wrapper = await mountTab([user()])
    expect(wrapper.text()).toContain('alice')
  })

  it('offers approve only for an inactive user', async () => {
    const inactive = await mountTab([user({ active: false })])
    expect(buttonWithText(inactive, 'Approve')).toBeTruthy()
    expect(buttonWithText(inactive, 'Deactivate')).toBeFalsy()

    const active = await mountTab([user({ active: true })])
    expect(buttonWithText(active, 'Deactivate')).toBeTruthy()
    expect(buttonWithText(active, 'Approve')).toBeFalsy()
  })

  it('prefills the administrator switch from the row so approve never demotes', async () => {
    const wrapper = await mountTab([user({ active: false, admin: true })])

    wrapper.vm.startApprove(user({ active: false, admin: true }))
    await flushPromises()

    expect(wrapper.vm.approveAsAdmin).toBe(true)

    await wrapper.vm.confirmApprove()
    expect(approveUser).toHaveBeenCalledWith('alice', true)
  })

  it('disables the administrator switch for a tenant admin', async () => {
    const wrapper = await mountTab(
      [user({ active: false })],
      whoami({ globalAdmin: false, tenantAdmin: true, tenant: 't1' })
    )

    wrapper.vm.startApprove(user({ active: false }))
    await flushPromises()

    expect(wrapper.find('[role="switch"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Only a global administrator')
  })

  it('leaves the administrator switch enabled for a global admin', async () => {
    const wrapper = await mountTab([user({ active: false })])

    wrapper.vm.startApprove(user({ active: false }))
    await flushPromises()

    expect(wrapper.find('[role="switch"]').attributes('disabled')).toBeUndefined()
  })

  it('deactivates only after confirmation', async () => {
    const wrapper = await mountTab([user()])

    wrapper.vm.deactivateTarget = user()
    await flushPromises()
    expect(deactivateUser).not.toHaveBeenCalled()

    await wrapper.vm.confirmDeactivate()
    expect(deactivateUser).toHaveBeenCalledWith('alice')
  })

  it('warns that deletion cannot be undone and only deletes on confirm', async () => {
    const wrapper = await mountTab([user()])

    wrapper.vm.deleteTarget = user()
    await flushPromises()
    expect(wrapper.text()).toContain('This cannot be undone.')
    expect(deleteUser).not.toHaveBeenCalled()

    await wrapper.vm.confirmDelete()
    expect(deleteUser).toHaveBeenCalledWith('alice')
  })

  // Delete only reaches the caller's own namespace, so it must not be offered
  // for a row a global admin can see but cannot act on.
  it('hides delete for a user in another tenant', async () => {
    const wrapper = await mountTab([user({ tenant: 'namespace-b' })])

    expect(buttonWithText(wrapper, 'Delete')).toBeFalsy()
  })

  it('offers delete for a user in the callers own tenant', async () => {
    const wrapper = await mountTab(
      [user({ tenant: 't1' })],
      whoami({ globalAdmin: false, tenantAdmin: true, tenant: 't1' })
    )

    expect(buttonWithText(wrapper, 'Delete')).toBeTruthy()
  })

  it('saves permissions against the username', async () => {
    const wrapper = await mountTab([user()])

    wrapper.vm.permissionTarget = user()
    await wrapper.vm.savePermissions('CRUD')

    expect(updateUserPermissions).toHaveBeenCalledWith('alice', 'CRUD')
  })

  it('surfaces the server message when an action fails', async () => {
    const wrapper = await mountTab([user()])
    deactivateUser.mockRejectedValue({ response: { data: { error: 'Tenant mismatch' } } })

    wrapper.vm.deactivateTarget = user()
    await wrapper.vm.confirmDeactivate()
    await flushPromises()

    expect(wrapper.vm.error).toBe('Tenant mismatch')
  })

  it('falls back to a generic message when the server says nothing useful', async () => {
    const wrapper = await mountTab([user()])
    deactivateUser.mockRejectedValue(new Error('network'))

    wrapper.vm.deactivateTarget = user()
    await wrapper.vm.confirmDeactivate()
    await flushPromises()

    expect(wrapper.vm.error).toBe('Could not deactivate the user.')
  })

  it('shows a tenant column only for a global admin', async () => {
    const asGlobal = await mountTab([user()])
    expect(asGlobal.vm.columns.map((column) => column.key)).toContain('tenant')

    const asTenantAdmin = await mountTab([user()], whoami({ globalAdmin: false, tenantAdmin: true, tenant: 't1' }))
    expect(asTenantAdmin.vm.columns.map((column) => column.key)).not.toContain('tenant')
  })
})
