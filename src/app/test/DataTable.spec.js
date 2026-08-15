import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DataTable from '../src/components/DataTable.vue'
import { stubs } from './stubs'

const columns = [
  { key: 'username', label: 'Username' },
  { key: 'email', label: 'Email' }
]

const rows = [
  { id: '1', username: 'bob', email: 'bob@trevorism.com' },
  { id: '2', username: 'alice', email: 'alice@trevorism.com' }
]

function mountTable(props = {}, slots = {}) {
  return mount(DataTable, {
    props: { title: 'Users', columns, rows, ...props },
    slots,
    global: { stubs }
  })
}

function usernames(wrapper) {
  return wrapper.findAll('tbody tr').map((row) => row.findAll('td')[0].text())
}

describe('DataTable', () => {
  it('renders a header per column', () => {
    const headers = mountTable().findAll('thead th').map((th) => th.text())
    expect(headers[0]).toContain('Username')
    expect(headers[1]).toContain('Email')
  })

  it('sorts ascending on first header click and reverses on the second', async () => {
    const wrapper = mountTable()
    const header = wrapper.findAll('thead th')[0]

    await header.trigger('click')
    expect(usernames(wrapper)).toEqual(['alice', 'bob'])

    await header.trigger('click')
    expect(usernames(wrapper)).toEqual(['bob', 'alice'])
  })

  it('returns to the original order on the third click', async () => {
    const wrapper = mountTable()
    const header = wrapper.findAll('thead th')[0]

    await header.trigger('click')
    await header.trigger('click')
    await header.trigger('click')

    expect(usernames(wrapper)).toEqual(['bob', 'alice'])
  })

  it('honours an initial sort', () => {
    const wrapper = mountTable({ initialSort: { key: 'username', dir: 'asc' } })
    expect(usernames(wrapper)).toEqual(['alice', 'bob'])
  })

  it('filters by the search query', async () => {
    const wrapper = mountTable()
    await wrapper.setData({ query: 'alice' })

    expect(usernames(wrapper)).toEqual(['alice'])
  })

  it('does not sort a column marked unsortable', async () => {
    const wrapper = mountTable({
      columns: [{ key: 'username', label: 'Username', sortable: false }, columns[1]]
    })

    await wrapper.findAll('thead th')[0].trigger('click')

    expect(usernames(wrapper)).toEqual(['bob', 'alice'])
  })

  it('sorts from the keyboard on a focusable header', async () => {
    const wrapper = mountTable()
    const header = wrapper.findAll('thead th')[0]

    expect(header.attributes('tabindex')).toBe('0')

    await header.trigger('keydown.enter')
    expect(usernames(wrapper)).toEqual(['alice', 'bob'])

    await header.trigger('keydown.space')
    expect(usernames(wrapper)).toEqual(['bob', 'alice'])
  })

  it('leaves an unsortable header out of the tab order', () => {
    const wrapper = mountTable({
      columns: [{ key: 'username', label: 'Username', sortable: false }, columns[1]]
    })

    expect(wrapper.findAll('thead th')[0].attributes('tabindex')).toBeUndefined()
  })

  it('renders a per column slot override', () => {
    const wrapper = mountTable({}, { 'cell-username': '<b>overridden</b>' })
    expect(wrapper.html()).toContain('overridden')
  })

  it('adds an actions column only when the slot is provided', () => {
    expect(mountTable().findAll('thead th')).toHaveLength(2)

    const withActions = mountTable({}, { actions: '<button>Go</button>' })
    expect(withActions.findAll('thead th')).toHaveLength(3)
  })

  it('shows the empty text when nothing matches', async () => {
    const wrapper = mountTable({ emptyText: 'No users are visible to you.' })
    await wrapper.setData({ query: 'nobody' })

    expect(wrapper.text()).toContain('No users are visible to you.')
    expect(wrapper.find('tbody').exists()).toBe(false)
  })

  it('shows an error alert', () => {
    expect(mountTable({ error: 'Could not load users.' }).text()).toContain('Could not load users.')
  })

  it('renders booleans as yes and no', () => {
    const wrapper = mountTable({
      columns: [{ key: 'active', label: 'Active' }],
      rows: [{ id: '1', active: true }, { id: '2', active: false }]
    })

    expect(wrapper.findAll('tbody td').map((cell) => cell.text())).toEqual(['Yes', 'No'])
  })

  it('emits refresh when the refresh button is pressed', async () => {
    const wrapper = mountTable()
    const refresh = wrapper.findAll('button').find((button) => button.text().includes('Refresh'))

    await refresh.trigger('click')

    expect(wrapper.emitted('refresh')).toBeTruthy()
  })
})
