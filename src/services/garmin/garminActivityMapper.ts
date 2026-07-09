// Traduce actividades Garmin al lenguaje de la app.
import type { GarminActivity, GarminActivityType } from '../../types'

export const ACTIVITY_META: Record<GarminActivityType, { label: string; icon: string; color: string }> = {
  running: { label: 'Running', icon: '🏃', color: '#4ade80' },
  strength: { label: 'Fuerza', icon: '🏋️', color: '#b4f629' },
  functional: { label: 'Funcional', icon: '⚡', color: '#fb923c' },
  walking: { label: 'Caminata', icon: '🚶', color: '#38bdf8' },
}

export function activitySummary(a: GarminActivity): string {
  const parts: string[] = [`${a.durationMin} min`]
  if (a.distanceKm) parts.push(`${a.distanceKm} km`)
  if (a.paceMinKm) parts.push(`${a.paceMinKm} min/km`)
  if (a.avgHR) parts.push(`${a.avgHR} ppm`)
  parts.push(`${a.calories} kcal`)
  return parts.join(' · ')
}

/** ¿Cuenta como entrenamiento cumplido para la adherencia? */
export function countsAsTraining(a: GarminActivity): boolean {
  return a.type !== 'walking' || a.durationMin >= 40
}
