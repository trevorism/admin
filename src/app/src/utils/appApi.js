import axios from 'axios'

const APP_BASE = '/api/app'

function mapApp(raw) {
  if (!raw || (!raw.appName && !raw.clientId)) {
    return null
  }
  return {
    id: raw.id || null,
    appName: raw.appName || '',
    clientId: raw.clientId || '',
    active: raw.active === true,
    permissions: raw.permissions || '',
    replyUrls: Array.isArray(raw.replyUrls) ? raw.replyUrls : [],
    logoutUrls: Array.isArray(raw.logoutUrls) ? raw.logoutUrls : [],
    tenant: raw.tenantGuid || raw.tenantId || '',
    dateCreated: raw.dateCreated || null,
    dateExpired: raw.dateExpired || null
  }
}

async function listApps() {
  const response = await axios.get(`${APP_BASE}/`)
  const apps = Array.isArray(response.data) ? response.data : []
  return apps.map(mapApp).filter(Boolean)
}

async function registerApp({ appName, replyUrls, logoutUrls, permissions }) {
  if (!appName?.trim()) {
    throw new Error('app_name_required')
  }
  const response = await axios.post(`${APP_BASE}/`, {
    appName: appName.trim(),
    replyUrls: toUrlList(replyUrls),
    logoutUrls: toUrlList(logoutUrls),
    permissions: permissions || ''
  })
  return {
    app: mapApp(response.data?.app),
    clientSecret: response.data?.clientSecret || ''
  }
}

async function rotateAppSecret(clientId) {
  if (!clientId) {
    throw new Error('client_id_required')
  }
  const response = await axios.put(`${APP_BASE}/${encodeURIComponent(clientId)}/secret`)
  return response.data?.clientSecret || ''
}

async function deleteApp(id) {
  if (!id) {
    throw new Error('app_id_required')
  }
  await axios.delete(`${APP_BASE}/${encodeURIComponent(id)}`)
}

function toUrlList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean)
  }
  return String(value || '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export { listApps, registerApp, rotateAppSecret, deleteApp, mapApp, toUrlList }
