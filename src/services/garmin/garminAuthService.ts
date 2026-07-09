// Autenticación Garmin Connect (OAuth2 + PKCE) — conexión real preparada.
// Requisitos para producción:
//  1. Credenciales del Garmin Connect Developer Program (.env con VITE_GARMIN_*).
//  2. Un proxy backend mínimo (VITE_GARMIN_TOKEN_PROXY) que haga el intercambio
//     code→token: el client_secret NUNCA vive en el bundle del navegador.
// Sin nada de eso, la app funciona igual en modo demo.

export interface GarminAuthConfig {
  clientId: string
  redirectUri: string
  tokenProxy: string // URL del backend que intercambia el code por tokens
}

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
}

const TOKEN_KEY = 'reset78-garmin-tokens'
const VERIFIER_KEY = 'reset78-garmin-verifier'

export function getConfig(): GarminAuthConfig {
  const env = import.meta.env
  return {
    clientId: env.VITE_GARMIN_CLIENT_ID ?? '',
    redirectUri: env.VITE_GARMIN_REDIRECT_URI ?? '',
    tokenProxy: env.VITE_GARMIN_TOKEN_PROXY ?? '',
  }
}

export function isConfigured(): boolean {
  const c = getConfig()
  return !!(c.clientId && c.redirectUri)
}

// ---------- Tokens ----------
export function getTokens(): OAuthTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    return raw ? (JSON.parse(raw) as OAuthTokens) : null
  } catch {
    return null
  }
}
export function saveTokens(t: OAuthTokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t))
}
export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
}

// ---------- PKCE ----------
async function pkceChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const randomString = (len = 64) =>
  [...crypto.getRandomValues(new Uint8Array(len))].map((b) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[b % 62]).join('')

/** Inicia el flujo OAuth real: redirige a Garmin. Solo si está configurado. */
export async function startAuth(): Promise<{ ok: boolean; message?: string }> {
  if (!isConfigured()) {
    return {
      ok: false,
      message:
        'Garmin no está configurado. Define VITE_GARMIN_CLIENT_ID, VITE_GARMIN_CLIENT_SECRET (backend), VITE_GARMIN_REDIRECT_URI y VITE_GARMIN_TOKEN_PROXY en .env. Mientras tanto: modo demo.',
    }
  }
  const c = getConfig()
  const verifier = randomString()
  sessionStorage.setItem(VERIFIER_KEY, verifier)
  const challenge = await pkceChallenge(verifier)
  const params = new URLSearchParams({
    client_id: c.clientId,
    response_type: 'code',
    redirect_uri: c.redirectUri,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  window.location.href = `https://connect.garmin.com/oauth2Confirm?${params.toString()}`
  return { ok: true }
}

/** Procesa el callback (?code=...) intercambiando el code por tokens vía el proxy backend. */
export async function handleCallback(code: string): Promise<{ ok: boolean; message: string }> {
  const c = getConfig()
  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  if (!c.tokenProxy) {
    return { ok: false, message: 'Falta VITE_GARMIN_TOKEN_PROXY: el intercambio de token requiere backend (el secret no va en el navegador).' }
  }
  try {
    const res = await fetch(c.tokenProxy, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'garmin', code, codeVerifier: verifier, redirectUri: c.redirectUri }),
    })
    if (!res.ok) throw new Error(`proxy ${res.status}`)
    const data = await res.json()
    saveTokens({ accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 })
    return { ok: true, message: 'Garmin conectado.' }
  } catch (e) {
    return { ok: false, message: `Error intercambiando el token: ${String(e)}. Revisa el proxy backend.` }
  }
}

export type ConnectResult = { ok: true } | { ok: false; reason: 'not-configured' | 'error'; message: string }

export async function connect(): Promise<ConnectResult> {
  const res = await startAuth()
  if (!res.ok) return { ok: false, reason: 'not-configured', message: res.message! }
  return { ok: true }
}
