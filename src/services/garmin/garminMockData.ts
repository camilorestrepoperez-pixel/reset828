// Datos simulados de Garmin — deterministas por fecha (misma fecha = mismos datos).
import type { GarminDaily, GarminActivity, GarminActivityType } from '../../types'
import { weekdayIndex } from '../../lib/calc'

// Pseudo-random determinista a partir de la fecha
function seeded(date: string, salt: number) {
  let h = salt
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) % 100000
  return (h % 1000) / 1000 // 0..1
}

export function mockDaily(date: string): GarminDaily {
  const r = (salt: number) => seeded(date, salt)
  return {
    date,
    steps: Math.round(5500 + r(1) * 7000),
    sleepHours: Math.round((5.8 + r(2) * 2.4) * 10) / 10,
    stress: Math.round(20 + r(3) * 50),
    bodyBattery: Math.round(30 + r(4) * 65),
    activeCalories: Math.round(300 + r(5) * 500),
    restingHR: Math.round(52 + r(6) * 10),
  }
}

// Actividad simulada acorde al plan semanal (running mar/sáb, fuerza lun/mié/vie, funcional jue)
export function mockActivity(date: string): GarminActivity | null {
  const idx = weekdayIndex(date)
  const r = (salt: number) => seeded(date, salt)
  const types: (GarminActivityType | null)[] = ['strength', 'running', 'strength', 'functional', 'strength', 'running', null]
  const type = types[idx]
  if (!type) return null

  if (type === 'running') {
    const km = Math.round((4 + r(7) * 6) * 10) / 10
    const paceMin = 5.5 + r(8) * 1.5
    const durationMin = Math.round(km * paceMin)
    return {
      id: `mock-${date}`,
      date,
      type,
      name: idx === 5 ? 'Running largo Z2' : 'Running intervalos',
      durationMin,
      distanceKm: km,
      paceMinKm: `${Math.floor(paceMin)}:${String(Math.round((paceMin % 1) * 60)).padStart(2, '0')}`,
      avgHR: Math.round(138 + r(9) * 20),
      calories: Math.round(km * 68),
    }
  }
  const durationMin = Math.round(45 + r(7) * 25)
  return {
    id: `mock-${date}`,
    date,
    type,
    name: type === 'strength' ? 'Strength training' : 'Funcional metabólico',
    durationMin,
    avgHR: Math.round(112 + r(9) * 25),
    calories: Math.round(durationMin * 6.5),
  }
}
