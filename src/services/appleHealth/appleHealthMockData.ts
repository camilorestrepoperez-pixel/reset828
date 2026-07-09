// Datos simulados de Apple Health — deterministas por fecha.
import type { AppleDaily, UnifiedActivity } from '../../types'
import { weekdayIndex } from '../../lib/calc'

const seeded = (date: string, salt: number) => {
  let h = salt
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) % 100000
  return (h % 1000) / 1000
}

export function mockAppleDaily(date: string): AppleDaily {
  const r = (s: number) => seeded(date, s + 500)
  return {
    date,
    steps: Math.round(6000 + r(1) * 6500),
    activeCalories: Math.round(320 + r(2) * 450),
    sleepHours: Math.round((6 + r(3) * 2.2) * 10) / 10,
    restingHR: Math.round(54 + r(4) * 9),
    weight: undefined, // el peso manda desde el check-in
  }
}

export function mockAppleActivity(date: string): UnifiedActivity | null {
  const idx = weekdayIndex(date)
  const r = (s: number) => seeded(date, s + 600)
  // Apple registra caminatas los días de descanso/oficina
  if (idx === 6 || r(5) > 0.75) {
    const km = Math.round((2.5 + r(6) * 3.5) * 10) / 10
    return {
      id: `apple-${date}`, date, source: 'apple', type: 'walking',
      name: 'Caminata (Apple Watch)', durationMin: Math.round(km * 11),
      distanceKm: km, calories: Math.round(km * 45),
    }
  }
  return null
}
