export type StorageType = 'local' | 'session' | 'memory'

export type TTLString = `${number}${'s' | 'm' | 'h' | 'd'}`
export type TTLValue = TTLString | number

export interface StorageOptions {
  /** Key prefix — all keys stored as "prefix:key". Prevents collisions. */
  prefix?: string
  /** Which storage backend to use. Default: 'local' */
  storage?: StorageType
  /** Enable cross-tab sync via StorageEvent. Default: false */
  sync?: boolean
}

export interface SetOptions {
  /**
   * Time-to-live. Accepts ms number or shorthand string:
   * '30s' | '15m' | '2h' | '7d'
   */
  ttl?: TTLValue
}

export interface StoredEnvelope<T> {
  __v: T
  __e?: number
}

export interface TypedStorage<Schema extends Record<string, unknown>> {
  set<K extends keyof Schema & string>(key: K, value: Schema[K], options?: SetOptions): void
  get<K extends keyof Schema & string>(key: K): Schema[K] | null
  remove<K extends keyof Schema & string>(key: K): void
  has<K extends keyof Schema & string>(key: K): boolean
  clear(): void
  keys(): Array<keyof Schema & string>
  ttl<K extends keyof Schema & string>(key: K): number | null
  getAll(): Partial<Schema>
  onChange<K extends keyof Schema & string>(
    key: K,
    callback: (value: Schema[K] | null) => void
  ): () => void
}
