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

  if (g) {
    return {
      steps: g.steps, sleepHours: g.sleepHours, activeCalories: g.activeCalories,
      bodyBattery: g.bodyBattery, stress: g.stress, restingHR: g.restingHR, source: 'garmin',
    }
  }
  if (a) {
    return {
      steps: a.steps, sleepHours: a.sleepHours, activeCalories: a.activeCalories,
      restingHR: a.restingHR, source: 'apple',
    }
  }
  if (checkIn?.steps || checkIn?.sleep) {
    return { steps: checkIn.steps, sleepHours: checkIn.sleep, source: 'manual' }
  }
  return { source: 'ninguna' }
}
