const PERMISSION_OPTIONS = [
  { value: 'C', label: 'Create' },
  { value: 'R', label: 'Read' },
  { value: 'U', label: 'Update' },
  { value: 'D', label: 'Delete' },
  { value: 'E', label: 'Execute' }
]

const CANONICAL_ORDER = PERMISSION_OPTIONS.map((option) => option.value)

function parsePermissions(permissions) {
  const requested = (permissions || '').toUpperCase()
  return CANONICAL_ORDER.filter((letter) => requested.includes(letter))
}

function formatPermissions(letters) {
  const requested = Array.isArray(letters) ? letters : parsePermissions(letters)
  const upper = requested.map((letter) => String(letter).toUpperCase())
  return CANONICAL_ORDER.filter((letter) => upper.includes(letter)).join('')
}

function describePermissions(permissions) {
  const parsed = parsePermissions(permissions)
  if (!parsed.length) {
    return 'none'
  }
  return parsed.join('')
}

export { PERMISSION_OPTIONS, CANONICAL_ORDER, parsePermissions, formatPermissions, describePermissions }
