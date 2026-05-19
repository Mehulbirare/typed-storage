import { createStorage } from '../src/storage'

type TestSchema = {
  name: string
  age: number
  theme: 'light' | 'dark'
  cart: Array<{ id: string; qty: number }>
  token: string
}

describe('createStorage — basic operations', () => {
  const store = createStorage<TestSchema>({ prefix: 'test' })

  beforeEach(() => localStorage.clear())

  it('sets and gets a string value', () => {
    store.set('name', 'Mehul')
    expect(store.get('name')).toBe('Mehul')
  })

  it('sets and gets a number value', () => {
    store.set('age', 25)
    expect(store.get('age')).toBe(25)
  })

  it('sets and gets a union type', () => {
    store.set('theme', 'dark')
    expect(store.get('theme')).toBe('dark')
  })

  it('sets and gets an array value', () => {
    const cart = [{ id: 'a1', qty: 2 }]
    store.set('cart', cart)
    expect(store.get('cart')).toEqual(cart)
  })

  it('returns null for a missing key', () => {
    expect(store.get('name')).toBeNull()
  })

  it('removes a key', () => {
    store.set('name', 'Mehul')
    store.remove('name')
    expect(store.get('name')).toBeNull()
  })

  it('has() returns true for existing key', () => {
    store.set('name', 'Mehul')
    expect(store.has('name')).toBe(true)
  })

  it('has() returns false for missing key', () => {
    expect(store.has('name')).toBe(false)
  })

  it('clear() removes only keys with the prefix', () => {
    store.set('name', 'Mehul')
    store.set('age', 25)
    localStorage.setItem('other:key', 'stays')

    store.clear()

    expect(store.get('name')).toBeNull()
    expect(store.get('age')).toBeNull()
    expect(localStorage.getItem('other:key')).toBe('stays')
  })

  it('keys() returns unprefixed key names', () => {
    store.set('name', 'Mehul')
    store.set('age', 25)
    const k = store.keys()
    expect(k).toContain('name')
    expect(k).toContain('age')
  })

  it('getAll() returns all non-expired values', () => {
    store.set('name', 'Mehul')
    store.set('age', 25)
    const all = store.getAll()
    expect(all.name).toBe('Mehul')
    expect(all.age).toBe(25)
  })
})

describe('createStorage — TTL', () => {
  const store = createStorage<TestSchema>({ prefix: 'ttl' })

  beforeEach(() => localStorage.clear())

  it('returns value before TTL expires', () => {
    store.set('token', 'abc123', { ttl: '1h' })
    expect(store.get('token')).toBe('abc123')
  })

  it('returns null after TTL expires', () => {
    jest.useFakeTimers()
    store.set('token', 'abc123', { ttl: '1s' })
    jest.advanceTimersByTime(2000)
    expect(store.get('token')).toBeNull()
    jest.useRealTimers()
  })

  it('auto-removes expired key on get', () => {
    jest.useFakeTimers()
    store.set('token', 'abc123', { ttl: '1s' })
    jest.advanceTimersByTime(2000)
    store.get('token')
    expect(localStorage.getItem('ttl:token')).toBeNull()
    jest.useRealTimers()
  })

  it('has() returns false for expired key', () => {
    jest.useFakeTimers()
    store.set('token', 'abc123', { ttl: '1s' })
    jest.advanceTimersByTime(2000)
    expect(store.has('token')).toBe(false)
    jest.useRealTimers()
  })

  it('ttl() returns remaining ms for live key', () => {
    jest.useFakeTimers()
    store.set('token', 'abc123', { ttl: '1h' })
    jest.advanceTimersByTime(1000)
    const remaining = store.ttl('token')
    expect(remaining).toBeCloseTo(3_599_000, -3)
    jest.useRealTimers()
  })

  it('ttl() returns null for key without TTL', () => {
    store.set('name', 'Mehul')
    expect(store.ttl('name')).toBeNull()
  })

  it('ttl() returns null for expired key', () => {
    jest.useFakeTimers()
    store.set('token', 'abc123', { ttl: '1s' })
    jest.advanceTimersByTime(5000)
    expect(store.ttl('token')).toBeNull()
    jest.useRealTimers()
  })

  it('accepts raw ms for TTL', () => {
    jest.useFakeTimers()
    store.set('token', 'abc123', { ttl: 5000 })
    jest.advanceTimersByTime(6000)
    expect(store.get('token')).toBeNull()
    jest.useRealTimers()
  })
})

describe('createStorage — prefix namespacing', () => {
  beforeEach(() => localStorage.clear())

  it('stores keys with the prefix', () => {
    const store = createStorage<TestSchema>({ prefix: 'app' })
    store.set('name', 'Mehul')
    expect(localStorage.getItem('app:name')).not.toBeNull()
  })

  it('two stores with different prefixes do not collide', () => {
    const authStore = createStorage<TestSchema>({ prefix: 'auth' })
    const uiStore = createStorage<TestSchema>({ prefix: 'ui' })

    authStore.set('theme', 'dark')
    uiStore.set('theme', 'light')

    expect(authStore.get('theme')).toBe('dark')
    expect(uiStore.get('theme')).toBe('light')
  })

  it('works without a prefix', () => {
    const store = createStorage<TestSchema>()
    store.set('name', 'Mehul')
    expect(store.get('name')).toBe('Mehul')
  })
})

describe('createStorage — session storage', () => {
  beforeEach(() => sessionStorage.clear())

  it('reads and writes to sessionStorage', () => {
    const store = createStorage<TestSchema>({ prefix: 'sess', storage: 'session' })
    store.set('name', 'Mehul')
    expect(sessionStorage.getItem('sess:name')).not.toBeNull()
    expect(store.get('name')).toBe('Mehul')
  })
})

describe('createStorage — memory storage', () => {
  it('reads and writes without touching localStorage', () => {
    const store = createStorage<TestSchema>({ storage: 'memory' })
    store.set('name', 'Mehul')
    expect(localStorage.getItem('name')).toBeNull()
    expect(store.get('name')).toBe('Mehul')
  })
})

describe('createStorage — corrupted data', () => {
  const store = createStorage<TestSchema>({ prefix: 'corrupt' })

  beforeEach(() => localStorage.clear())

  it('returns null when stored JSON is malformed', () => {
    localStorage.setItem('corrupt:name', 'not-valid-json{{{')
    expect(store.get('name')).toBeNull()
  })
})
