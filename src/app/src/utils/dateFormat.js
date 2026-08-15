const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

function toDate(value) {
  const match = DATE_ONLY.exec(String(value).trim())
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }
  return new Date(value)
}

function formatDate(value) {
  if (value === null || value === undefined || value === '') {
    return ''
  }
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export { formatDate }
