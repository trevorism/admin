function isBlank(value) {
  return value === null || value === undefined || value === ''
}

function compareValues(a, b) {
  if (a === b) {
    return 0
  }
  if (isBlank(a)) {
    return 1
  }
  if (isBlank(b)) {
    return -1
  }
  if (typeof a === 'boolean' || typeof b === 'boolean') {
    return a === b ? 0 : a ? -1 : 1
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

function sortRows(rows, key, dir) {
  const source = Array.isArray(rows) ? rows : []
  if (!key) {
    return [...source]
  }
  const factor = dir === 'desc' ? -1 : 1
  return [...source].sort((left, right) => {
    const a = left?.[key]
    const b = right?.[key]
    // Blanks stay at the bottom in both directions, so a column of mostly-empty
    // expiry dates does not push every populated row off the first screen.
    if (isBlank(a) && isBlank(b)) {
      return 0
    }
    if (isBlank(a)) {
      return 1
    }
    if (isBlank(b)) {
      return -1
    }
    const result = compareValues(a, b)
    return result === 0 ? 0 : result * factor
  })
}

function matchesQuery(row, query, fields) {
  const needle = (query || '').trim().toLowerCase()
  if (!needle) {
    return true
  }
  const keys = Array.isArray(fields) && fields.length ? fields : Object.keys(row || {})
  return keys.some((key) => {
    const value = row?.[key]
    if (isBlank(value)) {
      return false
    }
    return String(value).toLowerCase().includes(needle)
  })
}

function matchesFacets(row, facets) {
  if (!facets) {
    return true
  }
  return Object.entries(facets).every(([key, expected]) => {
    if (isBlank(expected)) {
      return true
    }
    return String(row?.[key]) === String(expected)
  })
}

function filterRows(rows, { query, fields, facets } = {}) {
  const source = Array.isArray(rows) ? rows : []
  return source.filter((row) => matchesQuery(row, query, fields) && matchesFacets(row, facets))
}

function nextSortDirection(currentKey, currentDir, key) {
  if (currentKey !== key) {
    return { key, dir: 'asc' }
  }
  if (currentDir === 'asc') {
    return { key, dir: 'desc' }
  }
  return { key: null, dir: 'asc' }
}

export { compareValues, sortRows, matchesQuery, matchesFacets, filterRows, nextSortDirection }
