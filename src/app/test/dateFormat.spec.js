import { describe, it, expect } from 'vitest'
import { formatDate } from '../src/utils/dateFormat'

describe('formatDate', () => {
  it('drops the time from a timestamp', () => {
    const formatted = formatDate('2026-08-15T10:30:00.000Z')

    expect(formatted).not.toContain(':')
    expect(formatted).toContain('2026')
  })

  it('reads a date only value in the local timezone rather than utc', () => {
    expect(formatDate('2026-08-15')).toBe(
      new Date(2026, 7, 15).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    )
  })

  it('accepts epoch millis', () => {
    expect(formatDate(Date.UTC(2026, 7, 15, 12))).toContain('2026')
  })

  it('renders nothing for a missing value', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('')).toBe('')
  })

  it('shows an unparseable value as it came rather than hiding it', () => {
    expect(formatDate('not a date')).toBe('not a date')
  })
})
