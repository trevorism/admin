import axios from 'axios'

const TENANT_BASE = '/api/tenant'

function mapTenant(raw) {
  if (!raw || (!raw.name && !raw.guid)) {
    return null
  }
  return {
    id: raw.id || null,
    name: raw.name || '',
    domain: raw.domain || '',
    guid: raw.guid || ''
  }
}

async function listTenants() {
  const response = await axios.get(`${TENANT_BASE}/`)
  const tenants = Array.isArray(response.data) ? response.data : []
  return tenants.map(mapTenant).filter(Boolean)
}

async function getMyTenant() {
  const response = await axios.get(`${TENANT_BASE}/me`)
  return mapTenant(response.data)
}

async function createTenant({ name, domain }) {
  if (!name?.trim()) {
    throw new Error('tenant_name_required')
  }
  const response = await axios.post(`${TENANT_BASE}/`, {
    name: name.trim(),
    domain: (domain || '').trim()
  })
  return mapTenant(response.data)
}

export { listTenants, getMyTenant, createTenant, mapTenant }
