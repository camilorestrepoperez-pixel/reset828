// Motor de recomendación entreno ↔ nutrición.
// Usa el MENÚ RESET78 (35 comidas numeradas) con el mapeo explícito por tipo de día,
// más ajustes en vivo: proteína, calorías, tiempo, hambre y entreno fuerte.
import type { WorkoutDay, Recipe, CheckIn, GarminDaily, Targets, MealEntry, Session } from '../types'
import { byNum, MENU78 } from '../data/menu78'
import { suggestLightDay } from '../services/garmin/garminHealthMapper'

export type DayType = 'fuerza' | 'pierna' | 'running' | 'funcional' | 'descanso'

export const DAY_TYPE_INFO: Record<DayType, { label: string; icon: string; note: string }> = {
  fuerza: { label: 'Día de fuerza', icon: '🏋️', note: 'Proteína alta + carbohidrato limpio alrededor del entreno.' },
  pierna: { label: 'Día de pierna', icon: '🦵', note: 'Pierna pesada = permiso de más carbohidrato. Úsalo alrededor del entreno, no de madrugada viendo Netflix.' },
  running: { label: 'Día de running', icon: '🏃', note: 'Carbohidrato estratégico: snack liviano 30-45 min antes, proteína + carbo al terminar.' },
  funcional: { label: 'Día funcional', icon: '⚡', note: 'Comidas livianas y altas en proteína. Nada pesado antes del circuito.' },
  descanso: { label: 'Día de descanso', icon: '🧘', note: 'Menos carbohidrato, más vegetales y proteína. Hoy el déficit trabaja solo.' },
}

const LOWER_MUSCLES = ['pierna', 'femoral', 'glúteo', 'pantorrilla', 'cuádriceps']

/** Clasifica el día según sus ejercicios (detecta pierna por músculos del bloque principal) */
export function dayTypeFor(day: WorkoutDay): DayType {
  const types = day.exercises.map((e) => e.type)
  const nonMobility = types.filter((t) => t !== 'movilidad')
  if (nonMobility.length === 0) return 'descanso'
  if (types.includes('funcional')) return 'funcional'
  if (types.includes('fuerza')) {
    const principals = day.exercises.filter((e) => (e.block ?? 'principal') === 'principal' && e.type === 'fuerza')
    if (principals.length > 0) {
      const lower = principals.filter((e) => LOWER_MUSCLES.some((m) => e.muscle.toLowerCase().includes(m)))
      if (lower.length / principals.length >= 0.66) return 'pierna'
    }
    return 'fuerza'
  }
  return 'running'
}

// ---------- Mapeo explícito por tipo de día (números del menú RESET78) ----------
interface DayMap { des: number[]; alm: number[]; cena: number[]; snack: number[]; post?: number[]; pre?: number[] }

const DAY_MAP: Record<DayType, DayMap> = {
  fuerza: { des: [1, 2, 3], alm: [7, 10, 11, 12], cena: [16, 20, 21], snack: [23, 26, 28, 30], post: [31, 33, 34] },
  pierna: { des: [2, 5], alm: [8, 12, 13, 14], cena: [16, 20], snack: [23, 26, 28, 30], post: [32, 33, 35] },
  running: { des: [2, 5], alm: [9, 13, 15], cena: [16, 18], snack: [24, 25], post: [31, 32, 35], pre: [24, 25] },
  funcional: { des: [1, 2], alm: [7, 10, 15], cena: [17, 18, 19, 20], snack: [23, 26, 28, 30], post: [31, 34] },
  descanso: { des: [4, 6], alm: [10, 15, 17], cena: [17, 18, 19, 22], snack: [23, 26, 28, 30] },
}

// Pools de condición (números del menú)
const POOL_PROTEINA = [28, 26, 30, 23] // snacks altos en proteína
const POOL_PASADO_CENA = [18, 19, 22]
const POOL_PASADO_SNACK = [23, 26, 30]
const POOL_POCO_TIEMPO = [2, 6, 10, 20, 21, 24, 26, 30, 31, 34]
const POOL_HAMBRE = [17, 19, 22, 26, 28] // volumen + proteína
const POOL_ENTRENO_FUERTE_POST = [32, 33, 35]

// rotación determinista por fecha
const seed = (date: string, salt: number) => {
  let h = salt
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) % 99991
  return h
}
const pickNum = (nums: number[], date: string, salt: number): Recipe | undefined =>
  nums.length ? byNum(nums[seed(date, salt) % nums.length]) : undefined

export interface MealSuggestion {
  type: DayType
  fatigued: boolean
  note: string
  meals: Partial<Record<'desayuno' | 'almuerzo' | 'cena' | 'snack', Recipe>>
  preEntreno?: Recipe
  postEntreno?: Recipe
  quick: Recipe[] // alternativas rápidas
  alerts: string[]
}

export function buildMealSuggestion(opts: {
  day: WorkoutDay
  date: string
  checkIn?: CheckIn
  garminDaily?: GarminDaily
  session?: Session
  targets: Targets
  todayMeals: MealEntry[]
}): MealSuggestion {
  const { day, date, checkIn, garminDaily, session, targets, todayMeals } = opts
  const type = dayTypeFor(day)
  const map = DAY_MAP[type]
  const fatigued =
    (checkIn?.sleep !== undefined && checkIn.sleep > 0 && checkIn.sleep < 6) ||
    (checkIn?.energy !== undefined && checkIn.energy <= 4) ||
    suggestLightDay(garminDaily)

  const meals: MealSuggestion['meals'] = {
    desayuno: pickNum(map.des, date, 11),
    almuerzo: pickNum(map.alm, date, 22),
    cena: pickNum(map.cena, date, 33),
    snack: pickNum(map.snack, date, 44),
  }
  const preEntreno = map.pre ? pickNum(map.pre, date, 66) : undefined
  let postEntreno = map.post ? pickNum(map.post, date, 55) : undefined

  const alerts: string[] = []
  const eaten = {
    kcal: todayMeals.reduce((a, m) => a + m.kcal, 0),
    protein: todayMeals.reduce((a, m) => a + m.protein, 0),
  }
  const proteinLeft = targets.protein - eaten.protein
  const kcalLeft = targets.kcal - eaten.kcal

  // Poco tiempo hoy (rutina en modo rápida) → comidas rápidas en todos los espacios
  if (session?.mode === 'rapida') {
    const quickIn = (nums: number[]) => nums.filter((n) => POOL_POCO_TIEMPO.includes(n))
    const q = {
      des: quickIn(map.des), alm: quickIn(map.alm), cena: quickIn(map.cena), snack: quickIn(map.snack),
    }
    if (q.des.length) meals.desayuno = pickNum(q.des, date, 11)
    if (q.alm.length) meals.almuerzo = pickNum(q.alm, date, 22)
    if (q.cena.length) meals.cena = pickNum(q.cena, date, 33)
    if (q.snack.length) meals.snack = pickNum(q.snack, date, 44)
    alerts.push('Día sin tiempo: rutina rápida + comidas de menos de 15 minutos.')
  }

  // Proteína atrasada → snack/cena altos en proteína
  if (todayMeals.length >= 2 && proteinLeft > targets.protein * 0.45) {
    const snack = pickNum(POOL_PROTEINA, date, 77)
    if (snack) meals.snack = snack
    const bestCena = map.cena.map(byNum).sort((a, b) => b.protein - a.protein)[0]
    if (bestCena) meals.cena = bestCena
    alerts.push(`Faltan ${Math.round(proteinLeft)}g de proteína. Snack: ${snack?.name} · Cena: ${bestCena?.name} (${bestCena?.protein}g).`)
  }

  // Pasado de calorías → cena ligera del pool de rescate
  if (kcalLeft < 600 && todayMeals.length >= 2) {
    const cena = POOL_PASADO_CENA.map(byNum)
      .filter((r) => kcalLeft <= 0 || r.kcal <= Math.max(kcalLeft, 380))
      .sort((a, b) => b.protein / b.kcal - a.protein / a.kcal)[0] ?? byNum(19)
    meals.cena = cena
    meals.snack = pickNum(POOL_PASADO_SNACK, date, 88)
    if (kcalLeft <= 0) {
      alerts.push(`Techo de calorías alcanzado. Si hay hambre real: ${cena.name} (${cena.kcal} kcal) y nada más.`)
    } else {
      alerts.push(`Quedan ${Math.round(kcalLeft)} kcal. Cena de rescate: ${cena.name} (${cena.kcal} kcal, ${cena.protein}g prot).`)
    }
  }

  // Mucha hambre → volumen + proteína
  if (checkIn?.hunger !== undefined && checkIn.hunger >= 8) {
    const volumen = pickNum(POOL_HAMBRE, date, 99)
    alerts.push(`Hambre alta hoy (${checkIn.hunger}/10). Ataca con volumen: ${volumen?.name}. Agua antes de cada comida.`)
  }

  // Entrenó fuerte → post-entreno completo
  const rpes = session ? Object.values(session.logs).map((l) => l.rpe).filter((r): r is number => !!r) : []
  const trainedHard = !!session?.done && rpes.length > 0 && Math.max(...rpes) >= 9
  if (trainedHard && type !== 'descanso') {
    postEntreno = pickNum(POOL_ENTRENO_FUERTE_POST, date, 111)
    alerts.push(`Entrenaste fuerte (RPE ${Math.max(...rpes)}). Post-entreno completo: ${postEntreno?.name} — proteína + carbo limpio, sin miedo.`)
  }

  if (fatigued) {
    alerts.push('Día de poca energía: comidas simples y fáciles de digerir. Rutina en modo ligero.')
  }

  // Alternativas rápidas (2 que no estén ya sugeridas)
  const suggested = new Set([...Object.values(meals), preEntreno, postEntreno].filter(Boolean).map((r) => r!.id))
  const quick = POOL_POCO_TIEMPO.map(byNum).filter((r) => !suggested.has(r.id)).slice(0, 2)

  return { type, fatigued, note: DAY_TYPE_INFO[type].note, meals, preEntreno, postEntreno, quick, alerts }
}

/** Ingredientes de todas las recetas sugeridas de una semana (mercado automático) */
export function weekSuggestionIngredients(
  days: { day: WorkoutDay; date: string }[],
  targets: Targets,
): { name: string; qty: string; category: string }[] {
  const seen = new Map<string, { name: string; qty: string; category: string }>()
  for (const { day, date } of days) {
    const sug = buildMealSuggestion({ day, date, targets, todayMeals: [] })
    const recipes = [...Object.values(sug.meals), sug.preEntreno, sug.postEntreno].filter((r): r is Recipe => !!r)
    for (const r of recipes) {
      for (const ing of r.ingredients) {
        const key = ing.name.toLowerCase()
        if (!seen.has(key)) seen.set(key, ing)
      }
    }
  }
  return [...seen.values()]
}

export { MENU78 }
