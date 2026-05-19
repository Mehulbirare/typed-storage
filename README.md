# typed-storage

[![npm version](https://img.shields.io/npm/v/typed-storage)](https://www.npmjs.com/package/typed-storage)
[![npm downloads](https://img.shields.io/npm/dm/typed-storage)](https://www.npmjs.com/package/typed-storage)
[![bundle size](https://img.shields.io/bundlephobia/minzip/typed-storage)](https://bundlephobia.com/package/typed-storage)
[![license](https://img.shields.io/npm/l/typed-storage)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-first-blue)](https://www.typescriptlang.org/)

> TypeScript-first localStorage and sessionStorage with **TTL expiry**, **SSR safety**, **cross-tab sync**, and **full type inference**. Zero dependencies. ~1.5KB gzipped.

---

## Why typed-storage?

Plain `localStorage` has four major problems that every developer hits:

| Problem | Plain localStorage | typed-storage |
|---|---|---|
| No TypeScript types | `JSON.parse()` returns `any` | Full schema inference |
| No expiry/TTL | Must hand-roll timestamp logic | Built-in `'7d'`, `'1h'`, `'30s'` |
| Crashes in SSR / Next.js | `ReferenceError: localStorage is not defined` | Silently returns `null` |
| Key collisions | Global namespace, easy to clash | Prefix namespacing |

---

## Installation

```bash
npm install typed-storage
```

```bash
yarn add typed-storage
```

```bash
pnpm add typed-storage
```

---

## Quick Start

```ts
import { createStorage } from 'typed-storage'

const store = createStorage({ prefix: 'myapp' })

store.set('theme', 'dark')
store.get('theme')    // 'dark'
store.remove('theme')
```

---

## TypeScript Schema — Full Type Safety

Define your schema once and get full autocomplete and error detection everywhere.

```ts
import { createStorage } from 'typed-storage'

type AppSchema = {
  user: { id: number; name: string; role: 'admin' | 'user' }
  theme: 'light' | 'dark' | 'system'
  token: string
  cart: Array<{ id: string; qty: number; price: number }>
  onboardingStep: 1 | 2 | 3 | 4
}

const store = createStorage<AppSchema>({ prefix: 'app' })

// ✅ TypeScript knows exactly what each key holds
store.set('theme', 'dark')
store.set('theme', 'purple')       // ❌ TypeScript ERROR
store.get('user')?.role            // typed as 'admin' | 'user'
store.get('cart')?.[0].price       // typed as number
store.set('unknown', 'x')          // ❌ TypeScript ERROR — not in schema
```

---

## TTL — Auto-Expiring Data

Stop writing `Date.now() + 7 * 24 * 60 * 60 * 1000` by hand. Use human-readable TTL.

```ts
// Shorthand strings
store.set('token',    'abc123',  { ttl: '1h' })   // expires in 1 hour
store.set('session',  'xyz',     { ttl: '30m' })  // expires in 30 minutes
store.set('otp',      '123456',  { ttl: '5m' })   // expires in 5 minutes
store.set('cart',     [...],     { ttl: '7d' })   // expires in 7 days
store.set('flag',     true,      { ttl: '30s' })  // expires in 30 seconds

// Raw milliseconds also work
store.set('token', 'abc123', { ttl: 3_600_000 })

// Reading an expired key returns null and auto-removes it
store.get('otp')   // null after 5 minutes
```

Supported units: `s` (seconds), `m` (minutes), `h` (hours), `d` (days).

---

## SSR Safe — Works in Next.js App Router

```ts
// ✅ No crash in Server Components or getServerSideProps
const theme = store.get('theme')   // returns null on server, value on client

// Works in useEffect too
useEffect(() => {
  const user = store.get('user')
  if (user) setUser(user)
}, [])
```

When `localStorage` is unavailable (SSR, Edge, private browsing), `typed-storage` automatically falls back to an in-memory store so your code never throws.

---

## Prefix Namespacing — No Key Collisions

```ts
const authStore = createStorage<AuthSchema>({ prefix: 'auth' })
const uiStore   = createStorage<UISchema>  ({ prefix: 'ui'   })

authStore.set('token', 'abc')   // stored as "auth:token"
uiStore.set('token', 'xyz')     // stored as "ui:token" — no conflict

authStore.clear()   // clears only "auth:*" keys, leaves "ui:*" untouched
```

---

## Cross-Tab Sync

Get notified when a value changes in another browser tab.

```ts
const store = createStorage<AppSchema>({ prefix: 'app', sync: true })

// Listen for changes from other tabs
const unsubscribe = store.onChange('user', (newValue) => {
  console.log('User updated in another tab:', newValue)
  setUser(newValue)
})

// Clean up when component unmounts
onUnmount(unsubscribe)
```

---

## Full API Reference

### `createStorage<Schema>(options?)`

Creates a typed storage instance.

```ts
const store = createStorage<Schema>({
  prefix:  'myapp',   // string — key prefix. Default: ''
  storage: 'local',   // 'local' | 'session' | 'memory'. Default: 'local'
  sync:    false,     // enable cross-tab sync. Default: false
})
```

---

### `store.set(key, value, options?)`

Write a value.

```ts
store.set('theme', 'dark')
store.set('token', 'abc', { ttl: '1h' })
```

---

### `store.get(key)`

Read a value. Returns `null` if missing or expired.

```ts
const theme = store.get('theme')   // 'light' | 'dark' | 'system' | null
```

---

### `store.remove(key)`

Delete a key.

```ts
store.remove('token')
```

---

### `store.has(key)`

Check if a key exists and is not expired.

```ts
if (store.has('token')) {
  // token exists and is still valid
}
```

---

### `store.clear()`

Remove all keys belonging to this store's prefix.

```ts
store.clear()
```

---

### `store.keys()`

List all keys (without prefix, non-expired).

```ts
store.keys()  // ['theme', 'token', 'cart']
```

---

### `store.ttl(key)`

Get remaining TTL in milliseconds, or `null` if no TTL set.

```ts
store.set('token', 'abc', { ttl: '1h' })
store.ttl('token')  // ~3_600_000 ms
```

---

### `store.getAll()`

Get all non-expired values as an object.

```ts
store.getAll()  // { theme: 'dark', token: 'abc123' }
```

---

### `store.onChange(key, callback)`

Listen for changes from other tabs (requires `sync: true`). Returns an unsubscribe function.

```ts
const unsub = store.onChange('user', (value) => console.log(value))
unsub()  // stop listening
```

---

## Framework Examples

### React

```tsx
import { createStorage } from 'typed-storage'
import { useState, useEffect } from 'react'

type Schema = { theme: 'light' | 'dark' }
const store = createStorage<Schema>({ prefix: 'app' })

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    store.get('theme') ?? 'light'
  )

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light'
    store.set('theme', next)
    setTheme(next)
  }

  return { theme, toggle }
}
```

### Next.js App Router

```ts
// lib/storage.ts — shared across the app
import { createStorage } from 'typed-storage'

type AppSchema = {
  user: { id: string; name: string }
  theme: 'light' | 'dark'
}

export const appStore = createStorage<AppSchema>({
  prefix: 'myapp',
  sync: true,
})
```

```tsx
// app/layout.tsx — server component, no crash
import { appStore } from '@/lib/storage'

export default function Layout({ children }) {
  const theme = appStore.get('theme')  // null on server — safe
  return <html data-theme={theme ?? 'light'}>{children}</html>
}
```

### Vue 3

```ts
import { createStorage } from 'typed-storage'
import { ref, watchEffect } from 'vue'

type Schema = { theme: 'light' | 'dark' }
const store = createStorage<Schema>({ prefix: 'app' })

export function useTheme() {
  const theme = ref(store.get('theme') ?? 'light')

  watchEffect(() => {
    store.set('theme', theme.value)
  })

  return { theme }
}
```

### Vanilla TypeScript / Node.js

```ts
import { createStorage } from 'typed-storage'

const store = createStorage({ storage: 'memory' })   // in-memory for Node.js
store.set('key', 'value', { ttl: '5m' })
store.get('key')  // 'value'
```

---

## Migration from Plain localStorage

```ts
// Before
localStorage.setItem('theme', JSON.stringify('dark'))
const theme = JSON.parse(localStorage.getItem('theme') ?? 'null')

// After
const store = createStorage<{ theme: 'light' | 'dark' }>({ prefix: 'app' })
store.set('theme', 'dark')
const theme = store.get('theme')
```

---

## Bundle Size

- **~1.5 KB** gzipped
- **Zero** runtime dependencies
- **Tree-shakeable** ESM build

Tested with: React 18, Next.js 13/14/15, Vue 3, Svelte, plain TypeScript, Node.js 18+.

---

## License

MIT © [Mehulbirare](https://github.com/Mehulbirare)
