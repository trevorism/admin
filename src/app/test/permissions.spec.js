import { describe, it, expect } from 'vitest'
import {
  describePermissions,
  formatPermissions,
  parsePermissions,
  PERMISSION_OPTIONS
} from '../src/utils/permissions'

describe('parsePermissions', () => {
  it('uppercases, drops unsupported characters and dedupes', () => {
    expect(parsePermissions('rrcx')).toEqual(['C', 'R'])
    expect(parsePermissions("R;X X'")).toEqual(['R'])
  })

  it('returns an empty list for nothing', () => {
    expect(parsePermissions('')).toEqual([])
    expect(parsePermissions(null)).toEqual([])
    expect(parsePermissions(undefined)).toEqual([])
  })
})

describe('formatPermissions', () => {
  it('emits the canonical CRUDE order', () => {
    expect(formatPermissions(['E', 'C', 'R'])).toBe('CRE')
    expect(formatPermissions(['D', 'U', 'C', 'R', 'E'])).toBe('CRUDE')
  })

  it('round trips a messy string', () => {
    expect(formatPermissions(parsePermissions('rrcx'))).toBe('CR')
  })

  it('accepts a raw string as well as a list', () => {
    expect(formatPermissions('ecr')).toBe('CRE')
  })

  it('returns an empty string for nothing selected', () => {
    expect(formatPermissions([])).toBe('')
  })
})

describe('describePermissions', () => {
  it('reads none when nothing is granted', () => {
    expect(describePermissions('')).toBe('none')
    expect(describePermissions(null)).toBe('none')
  })

  it('reads the canonical letters otherwise', () => {
    expect(describePermissions('ecr')).toBe('CRE')
  })
})

describe('PERMISSION_OPTIONS', () => {
  it('covers exactly the five supported permissions in order', () => {
    expect(PERMISSION_OPTIONS.map((option) => option.value)).toEqual(['C', 'R', 'U', 'D', 'E'])
  })
})
