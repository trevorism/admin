import { describe, it, expect } from 'vitest'
import { routes } from '../src/router/index'

// The guard itself now comes from @trevorism/ui-auth, installed as
// app.use(TrevorismAuth, { router }). What admin still owns is which routes it
// marks, and the deliberate decision not to gate on being an administrator.
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

  // A signed-in non-administrator already has a valid session, so bouncing them to
  // login would return them here immediately and loop. They must reach AccessDenied,
  // which is why nothing here asks whether the visitor is an administrator.
  it('gates on a session and nothing more, so a non administrator reaches the denial', () => {
    expect(routes.some((route) => 'requiresAdmin' in (route.meta ?? {}))).toBe(false)
  })
})
