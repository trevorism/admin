import axios from 'axios'

const USER_BASE = '/api/user'

function mapUser(raw) {
  if (!raw || !raw.username) {
    return null
  }
  return {
    id: raw.id || null,
    username: raw.username,
    email: raw.email || '',
    admin: raw.admin === true,
    active: raw.active === true,
    permissions: raw.permissions || '',
    tenant: raw.tenantGuid || raw.tenantId || '',
    dateCreated: raw.dateCreated || null,
    dateExpired: raw.dateExpired || null
  }
}

async function listUsers() {
  const response = await axios.get(`${USER_BASE}/`)
  const users = Array.isArray(response.data) ? response.data : []
  return users.map(mapUser).filter(Boolean)
}

async function registerUser({ username, email, permissions }) {
  if (!username?.trim()) {
    throw new Error('username_required')
  }
  if (!email?.trim()) {
    throw new Error('email_required')
  }
  const response = await axios.post(`${USER_BASE}/`, {
    username: username.trim(),
    email: email.trim(),
    permissions: permissions || ''
  })
  return { username: response.data?.username || '', password: response.data?.password || '' }
}

async function approveUser(username, admin) {
  if (!username) {
    throw new Error('username_required')
  }
  await axios.post(`${USER_BASE}/approve`, { username, admin })
}

async function deactivateUser(username) {
  if (!username) {
    throw new Error('username_required')
  }
  await axios.post(`${USER_BASE}/deactivate`, { username })
}

async function updateUserPermissions(username, permissions) {
  if (!username) {
    throw new Error('username_required')
  }
  if (typeof permissions !== 'string') {
    throw new Error('permissions_required')
  }
  await axios.post(`${USER_BASE}/permissions`, { username, permissions })
}

async function deleteUser(username) {
  if (!username) {
    throw new Error('username_required')
  }
  await axios.delete(`${USER_BASE}/${encodeURIComponent(username)}`)
}

export {
  listUsers,
  registerUser,
  approveUser,
  deactivateUser,
  updateUserPermissions,
  deleteUser,
  mapUser
}
