// Apple Health / HealthKit — capa preparada.
// REALIDAD TÉCNICA: HealthKit NO es accesible desde una web/PWA pura.
// Esta capa queda lista para cuando la app se empaquete como iOS nativa
// (Capacitor + plugin capacitor-health, o React Native + react-native-health).
// Mientras tanto: modo demo (mock) o registro manual en el check-in.
import type { AppleDaily, UnifiedActivity } from '../../types'
import { mockAppleDaily, mockAppleActivity } from './appleHealthMockData'
import { addDays, todayStr } from '../../lib/calc'

export type AppleAvailability = 'native' | 'web-unavailable'

/** Detecta si corremos dentro de un wrapper nativo (Capacitor) con HealthKit */
export function availability(): AppleAvailability {
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
  if (w.Capacitor?.isNativePlatform?.()) return 'native'
  return 'web-unavailable'
}

export interface AppleSyncResult {
  ok: boolean
  message: string
  daily: Record<string, AppleDaily>
  activities: UnifiedActivity[]
  syncedAt: string
}

export async function sync(opts: { demo: boolean; days?: number }): Promise<AppleSyncResult> {
  const { demo, days = 7 } = opts
  const syncedAt = new Date().toISOString()

  if (demo) {
    await new Promise((r) => setTimeout(r, 400))
    const daily: Record<string, AppleDaily> = {}
    const activities: UnifiedActivity[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = addDays(todayStr(), -i)
      daily[d] = mockAppleDaily(d)
      const act = mockAppleActivity(d)
      if (act) activities.push(act)
    }
    return { ok: true, message: `${days} días importados de Apple Health (demo).`, daily, activities, syncedAt }
  }

  if (availability() === 'web-unavailable') {
    return {
      ok: false,
      message:
        'HealthKit no es accesible desde el navegador. Para conexión real hay que empaquetar la app como iOS nativa (Capacitor). Usa modo demo o registra pasos/sueño en el check-in.',
      daily: {}, activities: [], syncedAt,
    }
  }

  // Rama nativa (futura): pedir permisos y leer HKQuantityTypes vía plugin.
  // const health = (window as any).Capacitor.Plugins.Health
  // await health.requestAuthorization({ read: ['steps','sleep','heartRate','activeEnergy','weight','workouts'] })
  return { ok: false, message: 'Plugin HealthKit no instalado en este build nativo.', daily: {}, activities: [], syncedAt }
}
