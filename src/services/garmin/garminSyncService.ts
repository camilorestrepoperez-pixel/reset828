// Sincronización Garmin: hoy trae datos mock (modo demo); mañana, la API oficial.
import type { GarminDaily, GarminActivity } from '../../types'
import { addDays, todayStr } from '../../lib/calc'
import { mockDaily, mockActivity } from './garminMockData'
import { isConfigured } from './garminAuthService'

export interface SyncResult {
  ok: boolean
  message: string
  daily: Record<string, GarminDaily>
  activities: GarminActivity[]
  syncedAt: string
}

export async function sync(opts: { demo: boolean; days?: number }): Promise<SyncResult> {
  const { demo, days = 7 } = opts
  const syncedAt = new Date().toISOString()

  if (demo) {
    // pequeña pausa para que se sienta la sincronización
    await new Promise((r) => setTimeout(r, 600))
    const daily: Record<string, GarminDaily> = {}
    const activities: GarminActivity[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = addDays(todayStr(), -i)
      daily[d] = mockDaily(d)
      const act = mockActivity(d)
      if (act) activities.push(act)
    }
    return { ok: true, message: `${days} días simulados importados.`, daily, activities, syncedAt }
  }

  if (!isConfigured()) {
    return { ok: false, message: 'Garmin no configurado. Activa el modo demo o define las credenciales.', daily: {}, activities: [], syncedAt }
  }

  // ---- Conexión real: Health API + Activity API vía proxy backend ----
  const { getTokens, getConfig } = await import('./garminAuthService')
  const tokens = getTokens()
  const proxy = getConfig().tokenProxy
  if (!tokens?.accessToken) {
    return { ok: false, message: 'Sin sesión Garmin. Pulsa "Conectar Garmin" primero.', daily: {}, activities: [], syncedAt }
  }
  if (!proxy) {
    return { ok: false, message: 'Falta VITE_GARMIN_TOKEN_PROXY (las APIs de Garmin requieren backend).', daily: {}, activities: [], syncedAt }
  }
  try {
    const res = await fetch(`${proxy.replace(/\/$/, '')}/garmin/sync?days=${days}`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    // El proxy devuelve { daily: Record<fecha, GarminDaily>, activities: GarminActivity[] }
    return { ok: true, message: `Sincronizado: ${Object.keys(data.daily ?? {}).length} días.`, daily: data.daily ?? {}, activities: data.activities ?? [], syncedAt }
  } catch (e) {
    return { ok: false, message: `Error sincronizando con Garmin: ${String(e)}`, daily: {}, activities: [], syncedAt }
  }
}
