import { describe, it, expect } from 'vitest'
import {
  compareValues,
  filterRows,
  matchesQuery,
  nextSortDirection,
  sortRows
} from '../src/utils/sortFilter'

describe('compareValues', () => {
  it('sorts blanks last regardless of direction', () => {
    expect(compareValues(null, 'a')).toBeGreaterThan(0)
    expect(compareValues('a', null)).toBeLessThan(0)
    expect(compareValues('', 'a')).toBeGreaterThan(0)
    expect(compareValues(undefined, 'a')).toBeGreaterThan(0)
  })

  it('puts true before false', () => {
    expect(compareValues(true, false)).toBeLessThan(0)
    expect(compareValues(false, true)).toBeGreaterThan(0)
    expect(compareValues(true, true)).toBe(0)
  })

  it('compares strings numerically so user10 follows user9', () => {
    expect(compareValues('user9', 'user10')).toBeLessThan(0)
  })

  it('is case insensitive', () => {
    expect(compareValues('alice', 'ALICE')).toBe(0)
  })
})

describe('sortRows', () => {
  const rows = [{ name: 'b' }, { name: 'a' }, { name: null }]

  it('sorts ascending with blanks last', () => {
    expect(sortRows(rows, 'name', 'asc').map((row) => row.name)).toEqual(['a', 'b', null])
  })

  it('keeps blanks last when descending', () => {
    expect(sortRows(rows, 'name', 'desc').map((row) => row.name)).toEqual(['b', 'a', null])
  })

  it('does not mutate the source array', () => {
    const source = [{ name: 'b' }, { name: 'a' }]
    sortRows(source, 'name', 'asc')
    expect(source.map((row) => row.name)).toEqual(['b', 'a'])
  })

  it('returns a copy when no sort key is set', () => {
    expect(sortRows(rows, null, 'asc')).toHaveLength(3)
    expect(sortRows(null, 'name', 'asc')).toEqual([])
  })
})

describe('matchesQuery', () => {
  const row = { username: 'Alice', email: 'alice@trevorism.com', active: true }

  it('matches any field case insensitively', () => {
    expect(matchesQuery(row, 'ALI', ['username', 'email'])).toBe(true)
    expect(matchesQuery(row, 'trevorism', ['email'])).toBe(true)
  })

  it('matches everything for an empty query', () => {
    expect(matchesQuery(row, '', ['username'])).toBe(true)
    expect(matchesQuery(row, '   ', ['username'])).toBe(true)
  })

  it('does not match a field that was not searched', () => {
    expect(matchesQuery(row, 'trevorism', ['username'])).toBe(false)
  })
})

describe('filterRows', () => {
  const rows = [
    { username: 'alice', active: true, admin: false },
    { username: 'bob', active: false, admin: true }
  ]

  it('applies facets as exact matches', () => {
    const result = filterRows(rows, { facets: { active: 'true' } })
    expect(result.map((row) => row.username)).toEqual(['alice'])
  })

  it('ignores blank facet values', () => {
    expect(filterRows(rows, { facets: { active: null } })).toHaveLength(2)
  })

  it('combines the query and the facets', () => {
    const result = filterRows(rows, {
      query: 'bob',
      fields: ['username'],
      facets: { admin: 'true' }
    })
    expect(result.map((row) => row.username)).toEqual(['bob'])
  })
})

describe('nextSortDirection', () => {
  it('cycles ascending then descending then unsorted', () => {
    expect(nextSortDirection(null, 'asc', 'name')).toEqual({ key: 'name', dir: 'asc' })
    expect(nextSortDirection('name', 'asc', 'name')).toEqual({ key: 'name', dir: 'desc' })
    expect(nextSortDirection('name', 'desc', 'name')).toEqual({ key: null, dir: 'asc' })
  })

  it('starts ascending on a different column', () => {
    expect(nextSortDirection('name', 'desc', 'email')).toEqual({ key: 'email', dir: 'asc' })
  })
})
