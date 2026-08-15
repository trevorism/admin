import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AppsTab from '../src/components/AppsTab.vue'
import { deleteApp, listApps, registerApp, rotateAppSecret } from '../src/utils/appApi'
import { stubs } from './stubs'

vi.mock('../src/utils/appApi', async () => {
  const actual = await vi.importActual('../src/utils/appApi')
  return {
    ...actual,
    listApps: vi.fn(),
    registerApp: vi.fn(),
    rotateAppSecret: vi.fn(),
    deleteApp: vi.fn()
  }
})

function app(overrides) {
  return {
    id: '1',
    appName: 'widget',
    clientId: 'c1',
    active: true,
    permissions: 'R',
    replyUrls: [],
    logoutUrls: [],
    tenant: '',
    ...overrides
  }
}

const whoami = { username: 'root', globalAdmin: true, tenantAdmin: false, tenant: null, canAdminister: true }

async function mountTab(apps = [app()]) {
  listApps.mockResolvedValue(apps)
  const wrapper = mount(AppsTab, { props: { whoami }, global: { stubs } })
  await flushPromises()
  return wrapper
}

describe('AppsTab', () => {
  beforeEach(() => {
    listApps.mockReset()
    registerApp.mockReset()
    rotateAppSecret.mockReset()
    deleteApp.mockReset().mockResolvedValue()
  })

  it('lists the applications it loaded', async () => {
    const wrapper = await mountTab()
    expect(wrapper.text()).toContain('widget')
  })

  it('reveals the secret once after registering', async () => {
    registerApp.mockResolvedValue({ app: app({ appName: 'newthing', clientId: 'c9' }), clientSecret: 's3cret' })
    const wrapper = await mountTab()

    wrapper.vm.registerForm = { appName: 'newthing', replyUrls: '', logoutUrls: '', permissions: [] }
    await wrapper.vm.submitRegister()
    await flushPromises()

    expect(wrapper.vm.revealOpen).toBe(true)
    expect(wrapper.vm.revealSecret).toBe('s3cret')
    expect(wrapper.text()).toContain('only time this secret will be shown')
  })

  it('reveals the secret after rotating', async () => {
    rotateAppSecret.mockResolvedValue('rotated')
    const wrapper = await mountTab()

    wrapper.vm.rotateTarget = app()
    await wrapper.vm.confirmRotate()
    await flushPromises()

    expect(rotateAppSecret).toHaveBeenCalledWith('c1')
    expect(wrapper.vm.revealSecret).toBe('rotated')
  })

  it('warns that rotation invalidates the current secret before doing it', async () => {
    const wrapper = await mountTab()

    wrapper.vm.rotateTarget = app()
    await flushPromises()

    expect(wrapper.text()).toContain('current secret stops working immediately')
    expect(rotateAppSecret).not.toHaveBeenCalled()
  })

  it('drops the secret from state and markup once the reveal is closed', async () => {
    rotateAppSecret.mockResolvedValue('rotated')
    const wrapper = await mountTab()

    wrapper.vm.rotateTarget = app()
    await wrapper.vm.confirmRotate()
    await flushPromises()
    expect(wrapper.text()).toContain('rotated')

    wrapper.vm.revealOpen = false
    wrapper.vm.clearSecret()
    await flushPromises()

    expect(wrapper.vm.revealSecret).toBe('')
    expect(wrapper.text()).not.toContain('rotated')
  })

  it('deletes only after confirmation', async () => {
    const wrapper = await mountTab()

    wrapper.vm.deleteTarget = app()
    await flushPromises()
    expect(deleteApp).not.toHaveBeenCalled()

    await wrapper.vm.confirmDelete()
    expect(deleteApp).toHaveBeenCalledWith('1')
  })

  it('surfaces a missing application name without calling the server', async () => {
    registerApp.mockRejectedValue(new Error('app_name_required'))
    const wrapper = await mountTab()

    wrapper.vm.registerForm = { appName: '', replyUrls: '', logoutUrls: '', permissions: [] }
    await wrapper.vm.submitRegister()
    await flushPromises()

    expect(wrapper.vm.error).toBe('An application name is required.')
  })

  it('surfaces the server message when rotation fails', async () => {
    rotateAppSecret.mockRejectedValue({ response: { data: { error: 'Not your tenant' } } })
    const wrapper = await mountTab()

    wrapper.vm.rotateTarget = app()
    await wrapper.vm.confirmRotate()
    await flushPromises()

    expect(wrapper.vm.error).toBe('Not your tenant')
  })
})
