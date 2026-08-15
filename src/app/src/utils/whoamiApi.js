import axios from 'axios'

const WHOAMI_BASE = '/api/whoami'

function mapWhoami(raw) {
  if (!raw) {
    return null
  }
  return {
    username: raw.username || '',
    role: raw.role || '',
    tenant: raw.tenant || null,
    globalAdmin: raw.globalAdmin === true,
    tenantAdmin: raw.tenantAdmin === true,
    canAdminister: raw.canAdminister === true,
    canManageTenants: raw.canManageTenants === true
  }
}

async function getWhoami() {
  const response = await axios.get(`${WHOAMI_BASE}/`)
  return mapWhoami(response.data)
}

export { getWhoami, mapWhoami }
