// Lógica del calendario: estado de cada día y armado de la grilla mensual.
import type { CheckIn, Session, MealEntry } from '../types'
import { addDays, todayStr, weekdayIndex, checkInScore } from './calc'

export type DayStatus = 'cumplido' | 'parcial' | 'fallado' | 'pendiente' | 'futuro'

export interface DayInfo {
  date: string
  status: DayStatus
  trained: boolean
  hasCheckIn: boolean
  hasMeals: boolean
  weight?: number
  kcal: number
}

export function getDayInfo(
  date: string,
  checkIns: Record<string, CheckIn>,
  sessions: Record<string, Session>,
  meals: MealEntry[],
): DayInfo {
  const today = todayStr()
  const c = checkIns[date]
  const sess = sessions[date]
  const dayMeals = meals.filter((m) => m.date === date)
  const trained = !!(sess?.done || c?.trainingDone)
  const hasCheckIn = !!c
  const hasMeals = dayMeals.length > 0
  const hasAnything = hasCheckIn || hasMeals || (sess && Object.keys(sess.logs).length > 0)

  let status: DayStatus
  if (date > today) status = 'futuro'
  else if (c && checkInScore(c) >= 2) status = 'cumplido'
  else if (date === today) status = 'pendiente'
  else if (hasAnything) status = 'parcial'
  else status = 'fallado'

  return {
    date,
    status,
    trained,
    hasCheckIn,
    hasMeals,
    weight: c?.weight,
    kcal: Math.round(dayMeals.reduce((a, m) => a + m.kcal, 0)),
  }
}

export const STATUS_COLORS: Record<DayStatus, string> = {
  cumplido: '#b4f629',
  parcial: '#fbbf24',
  fallado: '#ef4444',
  pendiente: '#38bdf8',
  futuro: '#3f3f46',
}

export const STATUS_LABELS: Record<DayStatus, string> = {
  cumplido: 'Cumplido',
  parcial: 'Parcial',
  fallado: 'Sin registro',
  pendiente: 'Hoy — pendiente',
  futuro: 'Próximo',
}

/** Grilla del mes: semanas (lunes a domingo) con fechas YYYY-MM-DD; null = fuera del mes */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startIdx = weekdayIndex(first) // 0=Lunes
  const cells: (string | null)[] = Array(startIdx).fill(null)
  for (let d = 0; d < daysInMonth; d++) cells.push(addDays(first, d))
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
