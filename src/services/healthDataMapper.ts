// Consolida métricas diarias de salud desde múltiples fuentes con prioridad:
// 1. Garmin (salud/recuperación) → 2. Apple Health (pasos/diario) → 3. Manual (check-in).
import type { GarminState, AppleHealthState, CheckIn } from '../types'

export interface DailyMetrics {
  steps?: number
  sleepHours?: number
  activeCalories?: number
  bodyBattery?: number
  stress?: number
  restingHR?: number
  source: 'garmin' | 'apple' | 'manual' | 'ninguna'
  /** campos donde el usuario escribió a mano y su valor manda sobre lo sincronizado */
  overrides: string[]
}

export function dailyMetrics(opts: {
  date: string
  garmin: GarminState
  apple: AppleHealthState
  checkIn?: CheckIn
}): DailyMetrics {
  const { date, garmin, apple, checkIn } = opts
  const g = garmin.daily[date]
  const a = apple.daily[date]

  let base: DailyMetrics
  if (g) {
    base = {
      steps: g.steps, sleepHours: g.sleepHours, activeCalories: g.activeCalories,
      bodyBattery: g.bodyBattery, stress: g.stress, restingHR: g.restingHR, source: 'garmin', overrides: [],
    }
  } else if (a) {
    base = {
      steps: a.steps, sleepHours: a.sleepHours, activeCalories: a.activeCalories,
      restingHR: a.restingHR, source: 'apple', overrides: [],
    }
  } else {
    base = { source: checkIn?.steps || checkIn?.sleep || checkIn?.caloriesBurned ? 'manual' : 'ninguna', overrides: [] }
  }

  // Manual override SIEMPRE manda: lo que el usuario escribió en el check-in pisa lo sincronizado
  if (checkIn?.steps !== undefined && checkIn.steps > 0) {
    if (base.steps !== undefined && base.source !== 'manual') base.overrides.push('pasos')
    base.steps = checkIn.steps
  }
  if (checkIn?.sleep !== undefined && checkIn.sleep > 0) {
    if (base.sleepHours !== undefined && base.source !== 'manual') base.overrides.push('sueño')
    base.sleepHours = checkIn.sleep
  }
  if (checkIn?.caloriesBurned !== undefined && checkIn.caloriesBurned > 0) {
    if (base.activeCalories !== undefined && base.source !== 'manual') base.overrides.push('calorías')
    base.activeCalories = checkIn.caloriesBurned
  }
  return base
}
