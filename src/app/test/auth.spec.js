import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCookieValue,
  getCurrentUserName,
  isLoggedIn,
  looksLikeAdministrator,
  loginUrlFor
} from '../src/utils/auth'

function setCookies(value) {
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => value
  })
}

describe('auth cookies', () => {
  beforeEach(() => {
    setCookies('')
  })

  it('reads a cookie by name', () => {
    setCookies('user_name=alice; admin=true')
    expect(getCookieValue('user_name')).toBe('alice')
    expect(getCookieValue('admin')).toBe('true')
  })

  it('returns empty for a cookie that is absent', () => {
    setCookies('other=1')
    expect(getCookieValue('user_name')).toBe('')
    expect(getCurrentUserName()).toBe('')
  })

  it('decodes encoded values', () => {
    setCookies('user_name=alice%40trevorism.com')
    expect(getCurrentUserName()).toBe('alice@trevorism.com')
  })

  it('treats a signed in user as logged in', () => {
    setCookies('user_name=alice')
    expect(isLoggedIn()).toBe(true)
  })

  it('treats whitespace as not logged in', () => {
    setCookies('user_name=%20')
    expect(isLoggedIn()).toBe(false)
  })
})

describe('looksLikeAdministrator', () => {
  it('accepts true in any case', () => {
    setCookies('admin=true')
    expect(looksLikeAdministrator()).toBe(true)
    setCookies('admin=TRUE')
    expect(looksLikeAdministrator()).toBe(true)
  })

  it('rejects false or absent', () => {
    setCookies('admin=false')
    expect(looksLikeAdministrator()).toBe(false)
    setCookies('')
    expect(looksLikeAdministrator()).toBe(false)
  })
})

describe('loginUrlFor', () => {
  it('encodes the return url', () => {
    expect(loginUrlFor('https://admin.auth.trevorism.com/apps')).toBe(
      'https://login.auth.trevorism.com?return_url=https%3A%2F%2Fadmin.auth.trevorism.com%2Fapps'
    )
  })
})
