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

  it('renders no group heading when nothing is grouped', () => {
    expect(mountTable().findAll('tbody th')).toHaveLength(0)
  })

  it('splits the rows into a tbody per group', () => {
    const wrapper = mountTable({
      groupBy: { key: 'tenant' },
      rows: [
        { id: '1', username: 'bob', tenant: 'b' },
        { id: '2', username: 'alice', tenant: 'a' },
        { id: '3', username: 'carol', tenant: 'a' }
      ]
    })

    const groups = wrapper.findAll('tbody')
    expect(groups).toHaveLength(2)
    expect(groups[0].find('th').text()).toBe('a')
    expect(groups[0].findAll('tr')).toHaveLength(3)
    expect(groups[1].find('th').text()).toBe('b')
  })

  it('labels a group through the supplied function', () => {
    const wrapper = mountTable({
      groupBy: { key: 'tenant', label: (value) => `Tenant ${value}` },
      rows: [{ id: '1', username: 'bob', tenant: 'b' }]
    })

    expect(wrapper.find('tbody th').text()).toBe('Tenant b')
  })

  it('sorts the ungrouped rows last', () => {
    const wrapper = mountTable({
      groupBy: { key: 'tenant' },
      rows: [
        { id: '1', username: 'bob', tenant: '' },
        { id: '2', username: 'alice', tenant: 'a' }
      ]
    })

    expect(wrapper.findAll('tbody th').map((heading) => heading.text())).toEqual(['a', 'Ungrouped'])
  })

  it('spans the group heading across the actions column too', () => {
    const wrapper = mountTable(
      { groupBy: { key: 'tenant' }, rows: [{ id: '1', username: 'bob', tenant: 'a' }] },
      { actions: '<button>Go</button>' }
    )

    expect(wrapper.find('tbody th').attributes('colspan')).toBe('3')
  })

  it('formats a date column instead of printing the timestamp', () => {
    const wrapper = mountTable({
      columns: [{ key: 'dateCreated', label: 'Created', type: 'date' }],
      rows: [{ id: '1', dateCreated: '2026-08-15T10:30:00.000Z' }]
    })

    const cell = wrapper.find('tbody td').text()
    expect(cell).not.toContain('T10:30')
    expect(cell).toContain('2026')
  })

  it('emits refresh when the refresh button is pressed', async () => {
    const wrapper = mountTable()
    const refresh = wrapper.findAll('button').find((button) => button.text().includes('Refresh'))

    await refresh.trigger('click')

    expect(wrapper.emitted('refresh')).toBeTruthy()
  })
})
