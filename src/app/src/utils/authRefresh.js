import axios from 'axios'
import { clearIdentityCookies, isLoggedIn, loginUrlFor } from './auth'

const PROACTIVE_INTERVAL_MS = 13 * 60 * 1000
const REFRESH_URL = '/api/refresh/'

const ANONYMOUS_PATHS = ['/api/refresh']

let refreshPromise = null
let redirecting = false

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios.post(REFRESH_URL).finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

function isAnonymousPath(url) {
  return ANONYMOUS_PATHS.some((path) => (url || '').includes(path))
}

function redirectToLogin() {
  if (redirecting) {
    return
  }
  redirecting = true
  clearIdentityCookies()
  window.location.assign(loginUrlFor(window.location.href))
}

function installAuthRefresh() {
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const { response, config } = error
      const retryable =
        response?.status === 401 && config && !config._retried && !isAnonymousPath(config.url)

      if (!retryable) {
        return Promise.reject(error)
      }

      config._retried = true
      try {
        await refreshSession()
      } catch {
        redirectToLogin()
        return Promise.reject(error)
      }
      return axios(config)
    }
  )
}

function startProactiveRefresh() {
  return setInterval(() => {
    if (isLoggedIn()) {
      refreshSession().catch(() => {})
    }
  }, PROACTIVE_INTERVAL_MS)
}

export { installAuthRefresh, startProactiveRefresh, redirectToLogin, PROACTIVE_INTERVAL_MS }
