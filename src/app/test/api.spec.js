import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import {
  approveUser,
  deactivateUser,
  deleteUser,
  listUsers,
  mapUser,
  registerUser,
  updateUserPermissions
} from '../src/utils/userApi'
import { listApps, mapApp, registerApp, rotateAppSecret, toUrlList } from '../src/utils/appApi'
import { createTenant, getMyTenant, listTenants } from '../src/utils/tenantApi'
import { getWhoami } from '../src/utils/whoamiApi'

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
}))

beforeEach(() => {
  axios.get.mockReset()
  axios.post.mockReset()
  axios.put.mockReset()
  axios.delete.mockReset()
})

describe('userApi', () => {
  it('registers a user and returns the one time password', async () => {
    axios.post.mockResolvedValue({ data: { username: 'jsmith', password: 'generated' } })

    const result = await registerUser({
      username: ' jsmith ',
      email: ' jsmith@acme.com ',
      permissions: 'CR'
    })

    expect(axios.post).toHaveBeenCalledWith('/api/user/', {
      username: 'jsmith',
      email: 'jsmith@acme.com',
      permissions: 'CR'
    })
    expect(result).toEqual({ username: 'jsmith', password: 'generated' })
  })

  it('requires a username and an email before registering', async () => {
    await expect(registerUser({ username: '  ', email: 'a@b.c' })).rejects.toThrow('username_required')
    await expect(registerUser({ username: 'jsmith', email: ' ' })).rejects.toThrow('email_required')
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('lists users and drops records without a username', async () => {
    axios.get.mockResolvedValue({ data: [{ username: 'alice' }, { email: 'x@y.z' }] })

    const users = await listUsers()

    expect(axios.get).toHaveBeenCalledWith('/api/user/')
    expect(users.map((user) => user.username)).toEqual(['alice'])
  })

  it('returns an empty list when the response is not an array', async () => {
    axios.get.mockResolvedValue({ data: { username: 'alice' } })
    expect(await listUsers()).toEqual([])
  })

  it('prefers tenantGuid but falls back to the cross tenant stamp', () => {
    expect(mapUser({ username: 'a', tenantGuid: 'g' }).tenant).toBe('g')
    expect(mapUser({ username: 'a', tenantId: 'ns' }).tenant).toBe('ns')
  })

  it('approves with the admin flag', async () => {
    axios.post.mockResolvedValue({ data: {} })
    await approveUser('alice', true)
    expect(axios.post).toHaveBeenCalledWith('/api/user/approve', { username: 'alice', admin: true })
  })

  it('deactivates by username', async () => {
    axios.post.mockResolvedValue({ data: {} })
    await deactivateUser('alice')
    expect(axios.post).toHaveBeenCalledWith('/api/user/deactivate', { username: 'alice' })
  })

  it('updates permissions by username', async () => {
    axios.post.mockResolvedValue({ data: {} })
    await updateUserPermissions('alice', 'CRUD')
    expect(axios.post).toHaveBeenCalledWith('/api/user/permissions', {
      username: 'alice',
      permissions: 'CRUD'
    })
  })

  it('encodes the username when deleting', async () => {
    axios.delete.mockResolvedValue({ data: {} })
    await deleteUser('alice smith')
    expect(axios.delete).toHaveBeenCalledWith('/api/user/alice%20smith')
  })

  it('validates before calling out', async () => {
    await expect(approveUser('', true)).rejects.toThrow('username_required')
    await expect(deactivateUser(null)).rejects.toThrow('username_required')
    await expect(deleteUser('')).rejects.toThrow('username_required')
    await expect(updateUserPermissions('alice', null)).rejects.toThrow('permissions_required')
    expect(axios.post).not.toHaveBeenCalled()
    expect(axios.delete).not.toHaveBeenCalled()
  })
})

describe('appApi', () => {
  it('lists apps and drops empty records', async () => {
    axios.get.mockResolvedValue({ data: [{ appName: 'widget', clientId: 'c1' }, {}] })

    const apps = await listApps()

    expect(axios.get).toHaveBeenCalledWith('/api/app/')
    expect(apps).toHaveLength(1)
  })

  it('splits url textareas into trimmed lists', () => {
    expect(toUrlList('https://a\n\n  https://b  ')).toEqual(['https://a', 'https://b'])
    expect(toUrlList(['https://a', ' '])).toEqual(['https://a'])
    expect(toUrlList(null)).toEqual([])
  })

  it('registers an app and returns the one time secret', async () => {
    axios.post.mockResolvedValue({
      data: { app: { appName: 'widget', clientId: 'c1' }, clientSecret: 's3cret' }
    })

    const result = await registerApp({ appName: ' widget ', replyUrls: 'https://a' })

    expect(axios.post).toHaveBeenCalledWith('/api/app/', {
      appName: 'widget',
      replyUrls: ['https://a'],
      logoutUrls: [],
      permissions: ''
    })
    expect(result.clientSecret).toBe('s3cret')
    expect(result.app.clientId).toBe('c1')
  })

  it('requires an application name', async () => {
    await expect(registerApp({ appName: '  ' })).rejects.toThrow('app_name_required')
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('rotates a secret by client id', async () => {
    axios.put.mockResolvedValue({ data: { clientSecret: 'rotated' } })
    expect(await rotateAppSecret('c1')).toBe('rotated')
    expect(axios.put).toHaveBeenCalledWith('/api/app/c1/secret')
  })

  it('never surfaces a client secret from a list response', () => {
    expect(mapApp({ appName: 'widget', clientSecret: 'leaked' }).clientSecret).toBeUndefined()
  })
})

describe('tenantApi', () => {
  it('lists tenants', async () => {
    axios.get.mockResolvedValue({ data: [{ name: 'Acme', guid: 'g1' }] })
    expect(await listTenants()).toHaveLength(1)
    expect(axios.get).toHaveBeenCalledWith('/api/tenant/')
  })

  it('reads the caller own tenant', async () => {
    axios.get.mockResolvedValue({ data: { name: 'Acme', guid: 'g1' } })
    expect((await getMyTenant()).name).toBe('Acme')
    expect(axios.get).toHaveBeenCalledWith('/api/tenant/me')
  })

  it('creates a tenant with trimmed values', async () => {
    axios.post.mockResolvedValue({ data: { name: 'Acme', guid: 'g1' } })
    await createTenant({ name: '  Acme  ', domain: ' acme.com ' })
    expect(axios.post).toHaveBeenCalledWith('/api/tenant/', { name: 'Acme', domain: 'acme.com' })
  })

  it('requires a tenant name', async () => {
    await expect(createTenant({ name: '' })).rejects.toThrow('tenant_name_required')
  })
})

describe('whoamiApi', () => {
  it('normalizes the flags to booleans', async () => {
    axios.get.mockResolvedValue({ data: { username: 'alice', canAdminister: true } })

    const whoami = await getWhoami()

    expect(whoami.canAdminister).toBe(true)
    expect(whoami.globalAdmin).toBe(false)
    expect(whoami.tenantAdmin).toBe(false)
  })
})
