const LOGIN_URL = 'https://login.auth.trevorism.com'

function getCookieValue(name) {
  const cookiePrefix = `${name}=`
  const cookies = document.cookie ? document.cookie.split('; ') : []
  for (const cookie of cookies) {
    if (cookie.startsWith(cookiePrefix)) {
      try {
        return decodeURIComponent(cookie.substring(cookiePrefix.length))
      } catch {
        return ''
      }
    }
  }
  return ''
}

function getCurrentUserName() {
  return getCookieValue('user_name')
}

function isLoggedIn() {
  return !!getCurrentUserName()?.trim()
}

// Only ever a rendering hint. The cookie is not HttpOnly, it reads "true" for a
// tenant admin as well as a global admin, and RefreshController never re-sets it.
// Authorization comes from /api/whoami and the signed token behind it.
function looksLikeAdministrator() {
  return getCookieValue('admin')?.trim().toLowerCase() === 'true'
}

function clearIdentityCookies() {
  document.cookie = 'user_name=; Max-Age=0; path=/; domain=.trevorism.com'
  document.cookie = 'user_name=; Max-Age=0; path=/'
}

function loginUrlFor(returnUrl) {
  return `${LOGIN_URL}?return_url=${encodeURIComponent(returnUrl)}`
}

export {
  getCookieValue,
  getCurrentUserName,
  isLoggedIn,
  looksLikeAdministrator,
  clearIdentityCookies,
  loginUrlFor
}
