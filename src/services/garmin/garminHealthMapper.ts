// Traduce métricas de salud Garmin a estados accionables del coach.
import type { GarminDaily } from '../../types'

export type RecoveryLevel = 'buena' | 'media' | 'baja'

export interface RecoveryStatus {
  level: RecoveryLevel
  color: string
  message: string
}

export function recoveryStatus(d: GarminDaily | undefined): RecoveryStatus | null {
  if (!d) return null
  // Regla simple: Body Battery manda, sueño y estrés matizan
  const score = d.bodyBattery - (d.sleepHours < 6.5 ? 15 : 0) - (d.stress > 55 ? 10 : 0)
  if (score >= 60) return { level: 'buena', color: '#b4f629', message: 'Recuperación buena. Dale con todo hoy.' }
  if (score >= 35) return { level: 'media', color: '#fbbf24', message: 'Recuperación media. Entrena, pero sin buscar récords.' }
  return { level: 'baja', color: '#ef4444', message: 'Recuperación baja. Hoy toca versión ligera o movilidad.' }
}

/** ¿El día pinta para sugerir modo ligero? */
export function suggestLightDay(d: GarminDaily | undefined): boolean {
  const r = recoveryStatus(d)
  return r?.level === 'baja'
}
