const UNREACHABLE_STATUSES = [502, 503, 504]
const UNREACHABLE_MESSAGE = 'Could not reach the server. Check that the API is running.'

// A gateway status only means the API is unreachable when nothing answered for it.
// The BFF itself returns 502 with an { error } body when a downstream call fails,
// and that message is more useful than a generic one.
function isUnreachable(error) {
  const status = error?.response?.status
  if (status) {
    return UNREACHABLE_STATUSES.includes(status)
  }
  return !!error?.request || error?.code === 'ERR_NETWORK'
}

function describeError(error, fallback) {
  const supplied = error?.response?.data?.error
  if (supplied) {
    return supplied
  }
  if (isUnreachable(error)) {
    return UNREACHABLE_MESSAGE
  }
  return fallback
}

export { describeError, isUnreachable, UNREACHABLE_MESSAGE }
