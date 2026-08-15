import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { authGuard, routes } from '../src/router/index'

const originalLocation = window.location

function setCookies(value) {
  Object.defineProperty(document, 'cookie', { configurable: true, get: () => value })
}

function stubLocation() {
  delete window.location
  window.location = { assign: vi.fn(), origin: 'https://admin.auth.trevorism.com', href: 'https://admin.auth.trevorism.com/' }
}

describe('routes', () => {
  it('exposes users, apps and tenants', () => {
    expect(routes.map((route) => route.name)).toEqual(['Users', 'Apps', 'Tenants'])
  })

  it('requires authentication everywhere', () => {
    expect(routes.every((route) => route.meta?.requiresAuth)).toBe(true)
  })

  it('passes the tab down as a prop', () => {
    expect(routes.map((route) => route.props())).toEqual([
      { tab: 'users' },
      { tab: 'apps' },
      { tab: 'tenants' }
    ])
  })
})

describe('authGuard', () => {
  beforeEach(() => {
    stubLocation()
    setCookies('')
  })

  afterEach(() => {
    window.location = originalLocation
  })

  it('sends an anonymous visitor to login with an encoded return url', () => {
    const allowed = authGuard({ meta: { requiresAuth: true }, fullPath: '/apps' })

    expect(allowed).toBe(false)
    expect(window.location.assign).toHaveBeenCalledWith(
      'https://login.auth.trevorism.com?return_url=https%3A%2F%2Fadmin.auth.trevorism.com%2Fapps'
    )
  })

  it('lets a signed in user through', () => {
    setCookies('user_name=alice')

    expect(authGuard({ meta: { requiresAuth: true }, fullPath: '/' })).toBe(true)
    expect(window.location.assign).not.toHaveBeenCalled()
  })

  // A signed-in non-administrator already has a valid session, so bouncing them to
  // login would return them here immediately and loop. They must reach AccessDenied.
  it('does not redirect a signed in user who is not an administrator', () => {
    setCookies('user_name=alice; admin=false')

    expect(authGuard({ meta: { requiresAuth: true }, fullPath: '/' })).toBe(true)
    expect(window.location.assign).not.toHaveBeenCalled()
  })

  it('ignores routes that do not require authentication', () => {
    expect(authGuard({ meta: {}, fullPath: '/' })).toBe(true)
    expect(window.location.assign).not.toHaveBeenCalled()
  })
})
