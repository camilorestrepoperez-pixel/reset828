// Strava: OAuth + importación de actividades (running, caminata, cycling, fuerza).
// Uso principal: actividades REALIZADAS, no planificación.
// Real: requiere VITE_STRAVA_CLIENT_ID / VITE_STRAVA_REDIRECT_URI y un proxy
// backend (VITE_STRAVA_TOKEN_PROXY) para el intercambio del secret.
// Sin credenciales → modo demo con datos simulados.
import type { UnifiedActivity } from '../../types'
import { addDays, todayStr, weekdayIndex } from '../../lib/calc'
import { CONFIG } from '../../config'

const TOKEN_KEY = 'reset78-strava-tokens'

interface StravaTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: number // epoch ms
}

export function getConfig() {
  return {
    clientId: CONFIG.STRAVA_CLIENT_ID,
    // Si no se define, el callback vuelve a la URL actual de la app (GitHub Pages)
    redirectUri:
      (import.meta.env.VITE_STRAVA_REDIRECT_URI as string | undefined) ??
      window.location.origin + window.location.pathname,
    tokenProxy: CONFIG.TOKEN_PROXY_URL,
  }
}

export const isConfigured = () => {
  const c = getConfig()
  return !!(c.clientId && c.tokenProxy)
}

export function getTokens(): StravaTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
export function saveTokens(t: StravaTokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t))
}
export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
}

export function startAuth(): { ok: boolean; message?: string } {
  if (!isConfigured()) {
    return {
      ok: false,
      message:
        'Strava aún no está configurado: faltan el Client ID y la URL del worker (src/config.ts). Sigue la guía de conexión — mientras tanto, modo demo.',
    }
  }
  const c = getConfig()
  const params = new URLSearchParams({
    client_id: c.clientId,
    response_type: 'code',
    redirect_uri: c.redirectUri,
    scope: 'activity:read_all',
    approval_prompt: 'auto',
    state: 'strava', // para reconocer el callback
  })
  window.location.href = `https://www.strava.com/oauth/authorize?${params.toString()}`
  return { ok: true }
}

/** Procesa el ?code= que devuelve Strava, intercambiándolo por tokens vía el worker */
export async function handleCallback(code: string): Promise<{ ok: boolean; message: string }> {
  const c = getConfig()
  if (!c.tokenProxy) return { ok: false, message: 'Falta la URL del worker (TOKEN_PROXY_URL).' }
  try {
    const res = await fetch(c.tokenProxy, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'strava', grant: 'code', code }),
    })
    if (!res.ok) throw new Error(`worker HTTP ${res.status}`)
    const data = await res.json()
    saveTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: (data.expires_at ?? 0) * 1000,
    })
    return { ok: true, message: 'Strava conectado. Dale a "Sincronizar".' }
  } catch (e) {
    return { ok: false, message: `Error conectando Strava: ${String(e)}` }
  }
}

/** Devuelve un access token vigente, refrescándolo vía worker si venció */
async function freshToken(): Promise<string | null> {
  const t = getTokens()
  if (!t) return null
  if (!t.expiresAt || t.expiresAt - Date.now() > 5 * 60 * 1000) return t.accessToken
  const c = getConfig()
  if (!c.tokenProxy || !t.refreshToken) return t.accessToken
  try {
    const res = await fetch(c.tokenProxy, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'strava', grant: 'refresh', refreshToken: t.refreshToken }),
    })
    if (!res.ok) return t.accessToken
    const data = await res.json()
    saveTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? t.refreshToken,
      expiresAt: (data.expires_at ?? 0) * 1000,
    })
    return data.access_token
  } catch {
    return t.accessToken
  }
}

// ---------- Mock determinista ----------
const seeded = (date: string, salt: number) => {
  let h = salt
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) % 100000
  return (h % 1000) / 1000
}

function mockActivity(date: string): UnifiedActivity | null {
  const idx = weekdayIndex(date)
  const r = (s: number) => seeded(date, s)
  // Strava: corre mar/sáb, pedalea algunos domingos, camina otros días
  if (idx === 1 || idx === 5) {
    const km = Math.round((4.5 + r(3) * 5.5) * 10) / 10
    const pace = 5.6 + r(4) * 1.4
    return {
      id: `strava-${date}`, date, source: 'strava', type: 'running',
      name: idx === 5 ? 'Long run ☀️' : 'Intervalos con el crew',
      durationMin: Math.round(km * pace), distanceKm: km,
      paceMinKm: `${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2, '0')}`,
      avgHR: Math.round(140 + r(5) * 18), calories: Math.round(km * 66),
    }
  }
  if (idx === 6 && r(6) > 0.5) {
    const km = Math.round(15 + r(7) * 20)
    return {
      id: `strava-${date}`, date, source: 'strava', type: 'walking',
      name: 'Ciclovía dominical 🚴', durationMin: Math.round(km * 3),
      distanceKm: km, avgHR: Math.round(115 + r(8) * 15), calories: Math.round(km * 25),
    }
  }
  return null
}

export interface StravaSyncResult {
  ok: boolean
  message: string
  activities: UnifiedActivity[]
  syncedAt: string
}

export async function sync(opts: { demo: boolean; days?: number }): Promise<StravaSyncResult> {
  const { demo, days = 14 } = opts
  const syncedAt = new Date().toISOString()

  if (demo) {
    await new Promise((r) => setTimeout(r, 500))
    const activities: UnifiedActivity[] = []
    for (let i = days - 1; i >= 0; i--) {
      const a = mockActivity(addDays(todayStr(), -i))
      if (a) activities.push(a)
    }
    return { ok: true, message: `${activities.length} actividades importadas de Strava (demo).`, activities, syncedAt }
  }

  const accessToken = await freshToken()
  if (!accessToken) {
    return { ok: false, message: 'Sin sesión Strava. Pulsa "Conectar Strava" primero.', activities: [], syncedAt }
  }
  try {
    // API oficial: GET https://www.strava.com/api/v3/athlete/activities
    const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=${days * 2}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const raw = (await res.json()) as any[]
    const typeMap: Record<string, UnifiedActivity['type']> = {
      Run: 'running', Walk: 'walking', Hike: 'walking', Ride: 'walking',
      WeightTraining: 'strength', Workout: 'functional',
    }
    const activities: UnifiedActivity[] = raw
      .filter((a) => typeMap[a.type])
      .map((a) => ({
        id: `strava-${a.id}`,
        date: String(a.start_date_local ?? a.start_date).slice(0, 10),
        source: 'strava',
        type: typeMap[a.type],
        name: a.name,
        durationMin: Math.round((a.moving_time ?? 0) / 60),
        distanceKm: a.distance ? Math.round(a.distance / 100) / 10 : undefined,
        avgHR: a.average_heartrate ? Math.round(a.average_heartrate) : undefined,
        calories: a.calories ? Math.round(a.calories) : undefined,
      }))
    return { ok: true, message: `${activities.length} actividades importadas de Strava.`, activities, syncedAt }
  } catch (e) {
    return { ok: false, message: `Error sincronizando Strava: ${String(e)}`, activities: [], syncedAt }
  }
}
