import type { TTLValue } from '../types'

const UNITS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
}

export function parseTTL(ttl: TTLValue): number {
  if (typeof ttl === 'number') {
    if (ttl <= 0) throw new RangeError(`TTL must be a positive number, got ${ttl}`)
    return ttl
  }

  const match = /^(\d+)(s|m|h|d)$/.exec(ttl)
  if (!match) {
    throw new Error(
      `Invalid TTL "${ttl}". Use a number (ms) or shorthand: "30s", "15m", "2h", "7d".`
    )
  }

  const value = parseInt(match[1], 10)
  if (value === 0) throw new RangeError(`TTL value must be greater than 0, got "${ttl}"`)

  return value * UNITS[match[2]]
}
