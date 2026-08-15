import { describe, it, expect } from 'vitest'
import { describeError, isUnreachable, UNREACHABLE_MESSAGE } from '../src/utils/errors'

describe('isUnreachable', () => {
  it('treats a gateway status as unreachable', () => {
    expect(isUnreachable({ response: { status: 502 } })).toBe(true)
    expect(isUnreachable({ response: { status: 503 } })).toBe(true)
    expect(isUnreachable({ response: { status: 504 } })).toBe(true)
  })

  it('treats an axios network failure as unreachable', () => {
    expect(isUnreachable({ request: {}, code: 'ERR_NETWORK' })).toBe(true)
    expect(isUnreachable({ request: {} })).toBe(true)
  })

  it('does not treat an ordinary rejection as unreachable', () => {
    expect(isUnreachable({ response: { status: 403 } })).toBe(false)
    expect(isUnreachable({ response: { status: 404 } })).toBe(false)
  })

  // Pre-flight validation throws a plain Error with a snake_case code and no
  // request or response; misreading that as a network failure would hide it.
  it('does not treat a pre-flight validation error as unreachable', () => {
    expect(isUnreachable(new Error('username_required'))).toBe(false)
    expect(isUnreachable(new Error('app_name_required'))).toBe(false)
  })
})

describe('describeError', () => {
  // The dev proxy answers 502 with no body when the API is down. Saying
  // "could not confirm your access" there points at the wrong problem.
  it('reports an unreachable API rather than an access problem', () => {
    const error = { response: { status: 502, data: '' } }

    expect(describeError(error, 'Could not confirm your access.')).toBe(UNREACHABLE_MESSAGE)
  })

  it('reports an unreachable API when nothing answered at all', () => {
    expect(describeError({ request: {}, code: 'ERR_NETWORK' }, 'Could not load users.')).toBe(
      UNREACHABLE_MESSAGE
    )
  })

  // The BFF maps an unrecognised downstream status to 502 but supplies its own
  // message, which is more specific than the generic unreachable text.
  it('prefers a message the server supplied even on a gateway status', () => {
    const error = { response: { status: 502, data: { error: 'Unable to list users' } } }

    expect(describeError(error, 'Could not load users.')).toBe('Unable to list users')
  })

  it('prefers a supplied message over the fallback', () => {
    const error = { response: { status: 403, data: { error: 'Administrator access is required' } } }

    expect(describeError(error, 'Could not load users.')).toBe('Administrator access is required')
  })

  it('uses the fallback for an ordinary failure with no message', () => {
    expect(describeError({ response: { status: 500, data: {} } }, 'Could not load users.')).toBe(
      'Could not load users.'
    )
    expect(describeError(new Error('boom'), 'Could not load users.')).toBe('Could not load users.')
  })
})
