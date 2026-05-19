import { parseTTL } from '../src/utils/parseTTL'

describe('parseTTL', () => {
  it('returns raw ms number as-is', () => {
    expect(parseTTL(5000)).toBe(5000)
    expect(parseTTL(1)).toBe(1)
  })

  it('parses seconds', () => {
    expect(parseTTL('30s')).toBe(30_000)
    expect(parseTTL('1s')).toBe(1_000)
  })

  it('parses minutes', () => {
    expect(parseTTL('15m')).toBe(900_000)
    expect(parseTTL('1m')).toBe(60_000)
  })

  it('parses hours', () => {
    expect(parseTTL('2h')).toBe(7_200_000)
    expect(parseTTL('1h')).toBe(3_600_000)
  })

  it('parses days', () => {
    expect(parseTTL('7d')).toBe(604_800_000)
    expect(parseTTL('1d')).toBe(86_400_000)
  })

  it('throws on invalid string format', () => {
    expect(() => parseTTL('5x' as any)).toThrow('Invalid TTL')
    expect(() => parseTTL('abc' as any)).toThrow('Invalid TTL')
    expect(() => parseTTL('' as any)).toThrow('Invalid TTL')
  })

  it('throws on zero value', () => {
    expect(() => parseTTL('0s')).toThrow('greater than 0')
    expect(() => parseTTL('0d')).toThrow('greater than 0')
  })

  it('throws on non-positive number', () => {
    expect(() => parseTTL(0)).toThrow('positive')
    expect(() => parseTTL(-100)).toThrow('positive')
  })
})
