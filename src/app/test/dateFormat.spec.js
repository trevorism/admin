import { describe, it, expect } from 'vitest'
import { expiryStatus, formatDate } from '../src/utils/dateFormat'

const NOW = Date.UTC(2026, 7, 15, 12)
const DAY = 24 * 60 * 60 * 1000

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

describe('expiryStatus', () => {
  it('calls a past date expired', () => {
    expect(expiryStatus(NOW - DAY, NOW)).toBe('expired')
  })

  it('calls the exact moment of expiry expired', () => {
    expect(expiryStatus(NOW, NOW)).toBe('expired')
  })

  it('warns inside the last two weeks', () => {
    expect(expiryStatus(NOW + DAY, NOW)).toBe('expiring')
    expect(expiryStatus(NOW + 13 * DAY, NOW)).toBe('expiring')
  })

  it('says nothing beyond two weeks', () => {
    expect(expiryStatus(NOW + 14 * DAY, NOW)).toBe('')
    expect(expiryStatus(NOW + 365 * DAY, NOW)).toBe('')
  })

  it('says nothing for a missing or unreadable date', () => {
    expect(expiryStatus(null, NOW)).toBe('')
    expect(expiryStatus('', NOW)).toBe('')
    expect(expiryStatus('not a date', NOW)).toBe('')
  })
})
