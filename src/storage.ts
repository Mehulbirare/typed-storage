import type {
  StorageOptions,
  SetOptions,
  TypedStorage,
  StoredEnvelope,
} from './types'
import { parseTTL } from './utils/parseTTL'
import { memoryStorage } from './utils/memoryStorage'

function getAdapter(type: 'local' | 'session' | 'memory'): Storage {
  if (typeof window === 'undefined' || type === 'memory') return memoryStorage
  try {
    if (type === 'session') return window.sessionStorage
    return window.localStorage
  } catch {
    return memoryStorage
  }
}

export function createStorage<
  Schema extends Record<string, unknown> = Record<string, unknown>,
>(options: StorageOptions = {}): TypedStorage<Schema> {
  const { prefix = '', storage = 'local', sync = false } = options
  const adapter = getAdapter(storage)

  function buildKey(key: string): string {
    return prefix ? `${prefix}:${key}` : key
  }

  function stripPrefix(fullKey: string): string {
    return prefix ? fullKey.slice(prefix.length + 1) : fullKey
  }

  function readRaw<K extends keyof Schema & string>(
    key: K
  ): StoredEnvelope<Schema[K]> | null {
    const raw = adapter.getItem(buildKey(key))
    if (!raw) return null
    try {
      return JSON.parse(raw) as StoredEnvelope<Schema[K]>
    } catch {
      return null
    }
  }

  function set<K extends keyof Schema & string>(
    key: K,
    value: Schema[K],
    opts?: SetOptions
  ): void {
    const envelope: StoredEnvelope<Schema[K]> = { __v: value }
    if (opts?.ttl !== undefined) {
      envelope.__e = Date.now() + parseTTL(opts.ttl)
    }
    adapter.setItem(buildKey(key), JSON.stringify(envelope))
  }

  function get<K extends keyof Schema & string>(key: K): Schema[K] | null {
    const envelope = readRaw(key)
    if (!envelope) return null

    if (envelope.__e !== undefined && Date.now() > envelope.__e) {
      adapter.removeItem(buildKey(key))
      return null
    }

    return envelope.__v
  }

  function remove<K extends keyof Schema & string>(key: K): void {
    adapter.removeItem(buildKey(key))
  }

  function has<K extends keyof Schema & string>(key: K): boolean {
    return get(key) !== null
  }

  function clear(): void {
    if (!prefix) {
      adapter.clear()
      return
    }
    const toDelete: string[] = []
    for (let i = 0; i < adapter.length; i++) {
      const k = adapter.key(i)
      if (k?.startsWith(`${prefix}:`)) toDelete.push(k)
    }
    toDelete.forEach((k) => adapter.removeItem(k))
  }

  function keys(): Array<keyof Schema & string> {
    const result: string[] = []
    for (let i = 0; i < adapter.length; i++) {
      const k = adapter.key(i)
      if (!k) continue
      if (prefix && !k.startsWith(`${prefix}:`)) continue
      result.push(stripPrefix(k))
    }
    return result as Array<keyof Schema & string>
  }

  function ttl<K extends keyof Schema & string>(key: K): number | null {
    const envelope = readRaw(key)
    if (!envelope?.__e) return null
    const remaining = envelope.__e - Date.now()
    return remaining > 0 ? remaining : null
  }

  function getAll(): Partial<Schema> {
    const result: Partial<Schema> = {}
    for (const k of keys()) {
      const value = get(k)
      if (value !== null) {
        result[k as keyof Schema] = value
      }
    }
    return result
  }

  function onChange<K extends keyof Schema & string>(
    key: K,
    callback: (value: Schema[K] | null) => void
  ): () => void {
    if (typeof window === 'undefined' || !sync) return () => {}

    const fullKey = buildKey(key)

    function handler(event: StorageEvent): void {
      if (event.key !== fullKey) return
      callback(get(key))
    }

    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }

  return { set, get, remove, has, clear, keys, ttl, getAll, onChange }
}
