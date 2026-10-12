const TOKEN_KEY = 'spamear_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Error de red')
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

/** Formatea céntimos de dólar → $1,234.56 */
export function formatUsd(cents) {
  if (cents == null) return ''
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
}

/** @deprecated usar formatUsd */
export const formatEur = formatUsd

export function timeLeft(expiresAt) {
  if (!expiresAt) return ''
  const ms = new Date(expiresAt) - Date.now()
  if (ms <= 0) return 'expirado'
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rm = m % 60
  if (h < 48) return rm ? `${h}h ${rm}m` : `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}
