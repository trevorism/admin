import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import UsersTab from '../src/components/UsersTab.vue'
import {
  approveUser,
  deactivateUser,
  deleteUser,
  listUsers,
  registerUser,
  updateUserPermissions
} from '../src/utils/userApi'
import { listTenants } from '../src/utils/tenantApi'
import { stubs } from './stubs'

vi.mock('../src/utils/userApi', () => ({
  listUsers: vi.fn(),
  registerUser: vi.fn(),
  approveUser: vi.fn(),
  deactivateUser: vi.fn(),
  updateUserPermissions: vi.fn(),
  deleteUser: vi.fn()
}))

vi.mock('../src/utils/tenantApi', () => ({
  listTenants: vi.fn(),
  getMyTenant: vi.fn(),
  createTenant: vi.fn()
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
    listTenants.mockReset().mockResolvedValue([])
    registerUser.mockReset().mockResolvedValue({ username: 'jsmith', password: 'generated-secret' })
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

  it('groups by tenant only for a global admin', async () => {
    const asGlobal = await mountTab([user()])
    expect(asGlobal.vm.groupBy).toEqual({ key: 'tenant', label: expect.any(Function) })

    const asTenantAdmin = await mountTab([user()], whoami({ globalAdmin: false, tenantAdmin: true, tenant: 't1' }))
    expect(asTenantAdmin.vm.groupBy).toBeNull()
  })

  it('renders one heading per tenant so the rows are visually separated', async () => {
    listTenants.mockResolvedValue([
      { guid: 'g-a', name: 'Acme' },
      { guid: 'g-b', name: 'Globex' }
    ])
    const wrapper = await mountTab([
      user({ username: 'alice', tenant: 'g-a' }),
      user({ username: 'bob', tenant: 'g-b' }),
      user({ username: 'carol', tenant: 'g-a' })
    ])

    const headings = wrapper.findAll('tbody th').map((heading) => heading.text())
    expect(headings).toHaveLength(2)
    expect(headings[0]).toContain('Acme')
    expect(headings[0]).toContain('2 users')
    expect(headings[1]).toContain('Globex')
    expect(headings[1]).toContain('1 user')
  })

  it('falls back to the guid when the tenant names cannot be loaded', async () => {
    listTenants.mockRejectedValue(new Error('forbidden'))
    const wrapper = await mountTab([user({ tenant: 'g-a' })])

    expect(wrapper.vm.error).toBe('')
    expect(wrapper.find('tbody th').text()).toContain('g-a')
  })

  it('labels the tenantless users rather than leaving a blank heading', async () => {
    const wrapper = await mountTab([user({ tenant: '' })])
    expect(wrapper.find('tbody th').text()).toContain('No tenant')
  })

  it('puts the tenantless users above every named tenant', async () => {
    listTenants.mockResolvedValue([{ guid: 'g-a', name: 'Acme' }])
    const wrapper = await mountTab([
      user({ username: 'alice', tenant: 'g-a' }),
      user({ username: 'bob', tenant: '' })
    ])

    const headings = wrapper.findAll('tbody th').map((heading) => heading.text())
    expect(headings[0]).toContain('No tenant')
    expect(headings[1]).toContain('Acme')
  })

  it('keeps the tenant searchable for a global admin now the column is gone', async () => {
    const wrapper = await mountTab([user()])

    expect(wrapper.vm.columns.map((column) => column.key)).not.toContain('tenant')
    expect(wrapper.vm.searchFields).toContain('tenant')
  })

  it('offers a register action', async () => {
    const wrapper = await mountTab([user()])
    expect(buttonWithText(wrapper, 'Register user')).toBeTruthy()
  })

  it('registers with the collected fields and the permissions as letters', async () => {
    const wrapper = await mountTab([user()])

    wrapper.vm.registerForm = { username: 'jsmith', email: 'jsmith@acme.com', permissions: ['R', 'C'] }
    await wrapper.vm.submitRegister()

    expect(registerUser).toHaveBeenCalledWith({
      username: 'jsmith',
      email: 'jsmith@acme.com',
      permissions: 'CR'
    })
  })

  it('reveals the generated password once and reloads the list', async () => {
    const wrapper = await mountTab([user()])

    wrapper.vm.registerForm = { username: 'jsmith', email: 'jsmith@acme.com', permissions: [] }
    await wrapper.vm.submitRegister()
    await flushPromises()

    expect(wrapper.vm.revealOpen).toBe(true)
    expect(wrapper.vm.revealPassword).toBe('generated-secret')
    expect(wrapper.text()).toContain('generated-secret')
    expect(listUsers).toHaveBeenCalledTimes(2)
  })

  it('forgets the password once the reveal is dismissed', async () => {
    const wrapper = await mountTab([user()])

    wrapper.vm.registerForm = { username: 'jsmith', email: 'jsmith@acme.com', permissions: [] }
    await wrapper.vm.submitRegister()
    wrapper.vm.clearPassword()

    expect(wrapper.vm.revealPassword).toBe('')
    expect(wrapper.vm.revealUsername).toBe('')
  })

  it('says the new user is pending approval rather than implying it can sign in', async () => {
    const wrapper = await mountTab([user()])

    wrapper.vm.registerOpen = true
    await flushPromises()

    expect(wrapper.text()).toContain('pending approval')
  })

  it('reports a missing field without calling the server', async () => {
    const wrapper = await mountTab([user()])
    registerUser.mockRejectedValue(new Error('email_required'))

    wrapper.vm.registerForm = { username: 'jsmith', email: '', permissions: [] }
    await wrapper.vm.submitRegister()

    expect(wrapper.vm.error).toBe('An email address is required.')
    expect(wrapper.vm.revealOpen).toBe(false)
  })

  it('surfaces the server message when registration is refused', async () => {
    const wrapper = await mountTab([user()])
    registerUser.mockRejectedValue({ response: { data: { error: 'Duplicate detected' } } })

    wrapper.vm.registerForm = { username: 'jsmith', email: 'jsmith@acme.com', permissions: [] }
    await wrapper.vm.submitRegister()

    expect(wrapper.vm.error).toBe('Duplicate detected')
    expect(wrapper.vm.revealOpen).toBe(false)
  })

  it('shows a plain date instead of the raw timestamp', async () => {
    const wrapper = await mountTab([user({ dateCreated: '2026-08-15T10:30:00.000Z' })])

    expect(wrapper.text()).not.toContain('2026-08-15T10:30:00.000Z')
    expect(wrapper.text()).toContain('2026')
  })
})
