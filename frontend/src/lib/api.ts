/**
 * Thin client for the FastAPI backend (see /backend). Enabled by setting VITE_API_URL
 * (e.g. http://localhost:8000); without it the app keeps using its built-in simulator.
 */

const RAW = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? ''
export const API_URL = RAW.replace(/\/+$/, '')
export const API_ENABLED = API_URL.length > 0

const TOKEN_KEY = 'dash-tokens'

interface Tokens {
  access: string
  refresh: string
}

export class ApiError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function readTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    return raw ? (JSON.parse(raw) as Tokens) : null
  } catch {
    return null
  }
}

let memoryTokens: Tokens | null = readTokens()

export const tokens = {
  has: () => memoryTokens !== null,
  set(t: Tokens | null) {
    memoryTokens = t
    try {
      if (t) localStorage.setItem(TOKEN_KEY, JSON.stringify(t))
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      // storage unavailable: the session just won't survive a reload
    }
  },
  access: () => memoryTokens?.access ?? null,
}

type AuthLostListener = () => void
const authLost = new Set<AuthLostListener>()
export function onAuthLost(fn: AuthLostListener) {
  authLost.add(fn)
  return () => {
    authLost.delete(fn)
  }
}

function expiresInSeconds(jwt: string): number {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return (payload.exp as number) - Date.now() / 1000
  } catch {
    return 0
  }
}

let refreshing: Promise<boolean> | null = null

/** Rotates the refresh token; concurrent callers share one request. */
async function refresh(): Promise<boolean> {
  if (refreshing) return refreshing
  const current = memoryTokens
  if (!current) return false
  refreshing = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refresh }),
      })
      if (!res.ok) throw new Error('refresh failed')
      const data = await res.json()
      tokens.set({ access: data.accessToken, refresh: data.refreshToken })
      return true
    } catch {
      tokens.set(null)
      authLost.forEach((fn) => fn())
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

/** A valid access token (refreshing first if it is about to expire), or null when signed out. */
export async function freshAccessToken(): Promise<string | null> {
  const t = memoryTokens
  if (!t) return null
  if (expiresInSeconds(t.access) < 30 && !(await refresh())) return null
  return memoryTokens?.access ?? null
}

function messageFrom(body: unknown, fallback: string): { message: string; code?: string } {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return { message: detail }
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string; loc?: unknown[] } | undefined
    const field = first?.loc?.filter((p) => p !== 'body').join('.')
    return { message: first?.msg ? `${field ? field + ': ' : ''}${first.msg}` : fallback }
  }
  if (detail && typeof detail === 'object') {
    const d = detail as { message?: string; code?: string }
    return { message: d.message ?? fallback, code: d.code }
  }
  return { message: fallback }
}

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = opts.body === undefined ? 'GET' : 'POST', body, auth = true } = opts

  const send = async (): Promise<Response> => {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (auth) {
      const token = await freshAccessToken()
      if (token) headers.Authorization = `Bearer ${token}`
    }
    return fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  let res: Response
  try {
    res = await send()
    if (res.status === 401 && auth && memoryTokens && (await refresh())) res = await send()
  } catch {
    throw new ApiError(0, 'Cannot reach the trading server. Check your connection and try again.')
  }

  if (res.status === 204) return undefined as T
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // empty / non-JSON body
  }
  if (!res.ok) {
    const { message, code } = messageFrom(data, `Request failed (${res.status})`)
    if (res.status === 401 && auth) authLost.forEach((fn) => fn())
    throw new ApiError(res.status, message, code)
  }
  return data as T
}

export function wsUrl(path: string): string {
  return API_URL.replace(/^http/, 'ws') + path
}
