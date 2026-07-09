import type { Profile, Targets, CheckIn, ExerciseLog, MealEntry } from '../types'

// ---------- Fechas ----------
export const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const addDays = (dateStr: string, n: number) => {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 0 = Lunes ... 6 = Domingo */
export const weekdayIndex = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00')
  return (d.getDay() + 6) % 7
}

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** Lunes de la semana de la fecha dada */
export const weekStart = (dateStr: string) => addDays(dateStr, -weekdayIndex(dateStr))

// ---------- Energía y macros ----------
const ACTIVITY_FACTORS: Record<Profile['activityLevel'], number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  alto: 1.725,
}

/** Mifflin-St Jeor */
export function calcTargets(p: Profile, currentWeight: number): Targets {
  const bmr =
    10 * currentWeight + 6.25 * p.height - 5 * p.age + (p.sex === 'M' ? 5 : -161)
  const maintenance = Math.round(bmr * ACTIVITY_FACTORS[p.activityLevel])
  // Déficit moderado: 20%, con piso de seguridad
  const deficit = Math.round(maintenance * 0.2)
  const kcal = Math.max(maintenance - deficit, p.sex === 'M' ? 1700 : 1400)
  // Proteína alta para conservar músculo: 2 g/kg de peso meta
  const protein = Math.round(p.goalWeight * 2)
  // Grasa: 0.9 g/kg peso actual
  const fat = Math.round(currentWeight * 0.9)
  const carbs = Math.max(Math.round((kcal - protein * 4 - fat * 9) / 4), 80)
  return { maintenance, deficit, kcal, protein, carbs, fat }
}

// ---------- Progresión ----------
export interface ProgressionSuggestion {
  action: 'subir' | 'mantener' | 'bajar'
  message: string
}

export function suggestProgression(history: { log: ExerciseLog }[]): ProgressionSuggestion | null {
  const last = history[history.length - 1]
  if (!last) return null
  const { log } = last
  const allDone = log.completed && log.sets.every((s) => s.reps !== '' && Number(s.reps) > 0)
  if (allDone && (log.rpe ?? 8) <= 8) {
    return { action: 'subir', message: 'Completaste todo con buena sensación. Sube 2.5 kg la próxima.' }
  }
  if (!log.completed || (log.rpe ?? 0) >= 9.5) {
    return { action: 'bajar', message: 'Sesión dura o incompleta. Mantén el peso o baja una serie.' }
  }
  return { action: 'mantener', message: 'Mantén el peso y busca más reps limpias.' }
}

// ---------- Rachas y disciplina ----------
export function checkInScore(c: CheckIn) {
  return (c.trainingDone ? 1 : 0) + (c.nutritionDone ? 1 : 0) + (c.waterDone ? 1 : 0)
}

/** Días consecutivos (hasta hoy o ayer) con check-in y ≥2 de 3 cumplidos */
export function calcStreak(checkIns: Record<string, CheckIn>): number {
  let streak = 0
  let day = todayStr()
  // hoy puede no estar aún: si no está, empezamos desde ayer
  if (!checkIns[day] || checkInScore(checkIns[day]) < 2) day = addDays(day, -1)
  while (checkIns[day] && checkInScore(checkIns[day]) >= 2) {
    streak++
    day = addDays(day, -1)
  }
  return streak
}

export function weekAdherence(checkIns: Record<string, CheckIn>, refDate: string) {
  const start = weekStart(refDate)
  let done = 0
  let possible = 0
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i)
    if (d > todayStr()) break
    possible += 3
    const c = checkIns[d]
    if (c) done += checkInScore(c)
  }
  return possible === 0 ? 0 : Math.round((done / possible) * 100)
}

// ---------- Insights (reglas) ----------
export interface Insight {
  level: 'ok' | 'warn' | 'push'
  text: string
}

export function dailyInsights(opts: {
  checkIns: Record<string, CheckIn>
  meals: MealEntry[]
  targets: Targets
  date: string
}): Insight[] {
  const { checkIns, meals, targets, date } = opts
  const out: Insight[] = []
  const today = checkIns[date]
  const todayMeals = meals.filter((m) => m.date === date)
  const protein = todayMeals.reduce((a, m) => a + m.protein, 0)
  const kcal = todayMeals.reduce((a, m) => a + m.kcal, 0)

  // Sueño bajo
  if (today?.sleep !== undefined && today.sleep > 0 && today.sleep < 6) {
    out.push({ level: 'warn', text: 'Dormiste poco. Baja la intensidad hoy — técnica limpia, sin héroes.' })
  }
  // Proteína
  if (todayMeals.length >= 2 && protein < targets.protein * 0.5) {
    out.push({ level: 'push', text: `La proteína va baja (${Math.round(protein)}g de ${targets.protein}g). Arréglalo en la próxima comida.` })
  }
  // Calorías pasadas
  if (kcal > targets.kcal * 1.1) {
    out.push({ level: 'warn', text: 'Te pasaste de calorías hoy. No lo compenses con hambre mañana — solo vuelve al plan.' })
  }
  // Peso: velocidad de pérdida (últimas 2 semanas)
  const weights: { date: string; w: number }[] = []
  for (let i = 14; i >= 0; i--) {
    const d = addDays(date, -i)
    const c = checkIns[d]
    if (c?.weight) weights.push({ date: d, w: c.weight })
  }
  if (weights.length >= 4) {
    const first = weights[0].w
    const last = weights[weights.length - 1].w
    const days = Math.max(1, (new Date(weights[weights.length - 1].date).getTime() - new Date(weights[0].date).getTime()) / 86400000)
    const perWeek = ((first - last) / days) * 7
    if (perWeek > 1.2) {
      out.push({ level: 'warn', text: `Estás bajando ${perWeek.toFixed(1)} kg/semana. Muy rápido — sube un poco las calorías o pierdes músculo.` })
    } else if (perWeek < 0.1 && days >= 12) {
      out.push({ level: 'push', text: 'El peso lleva 2 semanas plano. Ajuste pequeño: -150 kcal o +2000 pasos diarios.' })
    } else if (perWeek >= 0.3 && perWeek <= 1.0) {
      out.push({ level: 'ok', text: `Ritmo de pérdida: ${perWeek.toFixed(1)} kg/semana. Zona perfecta. No cambies nada.` })
    }
  }
  // Días sin entrenar (solo si ya hay historial de check-ins)
  let daysNoTraining = 0
  for (let i = 1; i <= 5; i++) {
    const c = checkIns[addDays(date, -i)]
    if (c && c.trainingDone) break
    daysNoTraining++
  }
  if (Object.keys(checkIns).length > 0 && daysNoTraining >= 3) {
    out.push({ level: 'push', text: `${daysNoTraining} días sin entrenar. Hoy vale un reset suave: 30 min de lo que sea, pero muévete.` })
  }
  // Adherencia semanal
  const adh = weekAdherence(checkIns, date)
  if (adh >= 80) out.push({ level: 'ok', text: `Adherencia semanal: ${adh}%. Buen trabajo. No perfecto, pero constante.` })

  if (out.length === 0) out.push({ level: 'ok', text: 'Vas bien. Sigue igual y marca tu check-in al final del día.' })
  return out
}

// ---------- Mensajes motivacionales ----------
const MESSAGES = [
  'Hoy no se negocia. Marca la rutina.',
  '88 a 78. Vamos por partes.',
  'El objetivo no es matarte, es repetir.',
  'Un día bueno no cambia nada. Cien días buenos lo cambian todo.',
  'La disciplina pesa gramos. El arrepentimiento pesa kilos.',
  'Nadie viene a salvarte. Menos mal: no lo necesitas.',
  'Entrena aunque no quieras. Sobre todo cuando no quieras.',
  'La báscula mide masa, no progreso. El hábito es el progreso.',
]

export function dailyMessage(date: string) {
  const seed = date.split('-').reduce((a, b) => a + parseInt(b), 0)
  return MESSAGES[seed % MESSAGES.length]
}

export const uid = () => Math.random().toString(36).slice(2, 10)
