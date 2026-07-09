import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Profile, Food, MealEntry, Session, CheckIn, Measurement,
  GroceryItem, ExerciseLog, WorkoutDay, CardioLog, Exercise,
  SessionMode, FavMeal, FavMealItem, GarminState, GarminDaily, GarminActivity, MealType,
  StravaState, AppleHealthState, AppleDaily, UnifiedActivity,
} from '../types'
import { FOODS } from '../data/foods'
import { GROCERY_SEED } from '../data/grocery'
import { WORKOUT_PLAN } from '../data/workouts'
import { todayStr, uid } from '../lib/calc'

const DEFAULT_PROFILE: Profile = {
  name: 'Camilo',
  age: 36,
  sex: 'M',
  height: 176,
  startWeight: 88,
  goalWeight: 78,
  activityLevel: 'moderado',
  trainingDays: 6,
  injuries: '',
  trainingPrefs: ['gimnasio', 'running', 'funcional'],
  experience: 'intermedio',
  sleepHours: 7,
  stressLevel: 6,
  foodPrefs: 'Comida colombiana real, alta proteína, fácil de preparar',
  foodAllergies: 'Espinaca',
  foodDislikes: 'Huevo duro',
  waterGoal: 8,
  onboarded: true,
}

interface State {
  profile: Profile
  customFoods: Food[]
  meals: MealEntry[]
  sessions: Record<string, Session> // por fecha
  checkIns: Record<string, CheckIn>
  measurements: Measurement[]
  grocery: GroceryItem[]
  water: Record<string, number> // vasos por fecha
  plan: WorkoutDay[]
  favorites: MealEntry[][] // legado, no usado
  dayOverrides: Record<string, string> // fecha → dayKey (entreno movido desde el calendario)
  favMeals: FavMeal[]
  garmin: GarminState
  strava: StravaState
  apple: AppleHealthState
  garminSent: Record<string, string> // fecha → timestamp del envío del entreno a Garmin

  updateProfile: (p: Partial<Profile>) => void
  addMeal: (m: Omit<MealEntry, 'id'>) => void
  removeMeal: (id: string) => void
  repeatDay: (fromDate: string, toDate: string) => void
  addCustomFood: (f: Omit<Food, 'id' | 'custom'>) => void
  setWater: (date: string, glasses: number) => void
  saveCheckIn: (c: CheckIn) => void
  saveExerciseLog: (date: string, dayKey: string, exId: string, log: ExerciseLog) => void
  saveCardio: (date: string, dayKey: string, cardio: CardioLog) => void
  markSessionDone: (date: string, dayKey: string, done: boolean) => void
  addMeasurement: (m: Measurement) => void
  toggleGrocery: (id: string) => void
  addGroceryItem: (item: Omit<GroceryItem, 'id' | 'checked'>) => void
  updateGroceryQty: (id: string, qty: string) => void
  removeGroceryItem: (id: string) => void
  resetGroceryChecks: () => void
  addIngredientsToGrocery: (items: { name: string; qty: string; category: string }[]) => void
  updateExercise: (dayKey: string, exId: string, patch: Partial<Exercise>) => void
  addExercise: (dayKey: string, ex: Omit<Exercise, 'id'>) => void
  removeExercise: (dayKey: string, exId: string) => void
  setDayOverride: (date: string, dayKey: string | null) => void
  setSessionMode: (date: string, dayKey: string, mode: SessionMode) => void
  duplicateRoutine: (fromKey: string, toKey: string) => void
  saveFavMeal: (name: string, meal: MealType, items: FavMealItem[]) => void
  removeFavMeal: (id: string) => void
  setGarminDemo: (demo: boolean) => void
  disconnectGarmin: () => void
  applyGarminSync: (daily: Record<string, GarminDaily>, activities: GarminActivity[], syncedAt: string) => void
  setStravaDemo: (demo: boolean) => void
  setStravaConnected: (connected: boolean) => void
  disconnectStrava: () => void
  applyStravaSync: (activities: UnifiedActivity[], syncedAt: string) => void
  setAppleDemo: (demo: boolean) => void
  disconnectApple: () => void
  applyAppleSync: (daily: Record<string, AppleDaily>, activities: UnifiedActivity[], syncedAt: string) => void
  markGarminSent: (date: string) => void
}

const getOrCreateSession = (sessions: Record<string, Session>, date: string, dayKey: string): Session =>
  sessions[date] ?? { date, dayKey, logs: {}, done: false }

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      customFoods: [],
      meals: [],
      sessions: {},
      checkIns: {
        // Dato inicial: peso de arranque registrado hoy... se genera vacío; peso inicial vive en profile
      },
      measurements: [],
      grocery: GROCERY_SEED,
      water: {},
      plan: WORKOUT_PLAN,
      favorites: [],
      dayOverrides: {},
      favMeals: [],
      garmin: { connected: false, demo: false, daily: {}, activities: [] },
      strava: { connected: false, demo: false, activities: [] },
      apple: { connected: false, demo: false, daily: {}, activities: [] },
      garminSent: {},

      updateProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),

      addMeal: (m) => set((s) => ({ meals: [...s.meals, { ...m, id: uid() }] })),
      removeMeal: (id) => set((s) => ({ meals: s.meals.filter((m) => m.id !== id) })),

      repeatDay: (fromDate, toDate) =>
        set((s) => ({
          meals: [
            ...s.meals,
            ...s.meals
              .filter((m) => m.date === fromDate)
              .map((m) => ({ ...m, id: uid(), date: toDate })),
          ],
        })),

      addCustomFood: (f) =>
        set((s) => ({ customFoods: [...s.customFoods, { ...f, id: uid(), custom: true }] })),

      setWater: (date, glasses) =>
        set((s) => ({ water: { ...s.water, [date]: Math.max(0, glasses) } })),

      saveCheckIn: (c) => set((s) => ({ checkIns: { ...s.checkIns, [c.date]: c } })),

      saveExerciseLog: (date, dayKey, exId, log) =>
        set((s) => {
          const sess = getOrCreateSession(s.sessions, date, dayKey)
          return { sessions: { ...s.sessions, [date]: { ...sess, logs: { ...sess.logs, [exId]: log } } } }
        }),

      saveCardio: (date, dayKey, cardio) =>
        set((s) => {
          const sess = getOrCreateSession(s.sessions, date, dayKey)
          return { sessions: { ...s.sessions, [date]: { ...sess, cardio } } }
        }),

      markSessionDone: (date, dayKey, done) =>
        set((s) => {
          const sess = getOrCreateSession(s.sessions, date, dayKey)
          return { sessions: { ...s.sessions, [date]: { ...sess, done } } }
        }),

      addMeasurement: (m) =>
        set((s) => ({
          measurements: [...s.measurements.filter((x) => x.date !== m.date), m].sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        })),

      toggleGrocery: (id) =>
        set((s) => ({
          grocery: s.grocery.map((g) => (g.id === id ? { ...g, checked: !g.checked } : g)),
        })),
      addGroceryItem: (item) =>
        set((s) => ({ grocery: [...s.grocery, { ...item, id: uid(), checked: false }] })),
      updateGroceryQty: (id, qty) =>
        set((s) => ({ grocery: s.grocery.map((g) => (g.id === id ? { ...g, qty } : g)) })),
      removeGroceryItem: (id) =>
        set((s) => ({ grocery: s.grocery.filter((g) => g.id !== id) })),
      resetGroceryChecks: () =>
        set((s) => ({ grocery: s.grocery.map((g) => ({ ...g, checked: false })) })),
      addIngredientsToGrocery: (items) =>
        set((s) => {
          const existing = new Set(s.grocery.map((g) => g.name.toLowerCase()))
          const nuevos = items
            .filter((i) => !existing.has(i.name.toLowerCase()))
            .map((i) => ({ ...i, id: uid(), checked: false }))
          return { grocery: [...s.grocery, ...nuevos] }
        }),

      updateExercise: (dayKey, exId, patch) =>
        set((s) => ({
          plan: s.plan.map((d) =>
            d.key !== dayKey
              ? d
              : { ...d, exercises: d.exercises.map((e) => (e.id === exId ? { ...e, ...patch } : e)) },
          ),
        })),
      addExercise: (dayKey, ex) =>
        set((s) => ({
          plan: s.plan.map((d) =>
            d.key !== dayKey ? d : { ...d, exercises: [...d.exercises, { ...ex, id: uid() }] },
          ),
        })),
      removeExercise: (dayKey, exId) =>
        set((s) => ({
          plan: s.plan.map((d) =>
            d.key !== dayKey ? d : { ...d, exercises: d.exercises.filter((e) => e.id !== exId) },
          ),
        })),

      setDayOverride: (date, dayKey) =>
        set((s) => {
          const next = { ...s.dayOverrides }
          if (dayKey) next[date] = dayKey
          else delete next[date]
          return { dayOverrides: next }
        }),

      setSessionMode: (date, dayKey, mode) =>
        set((s) => {
          const sess = getOrCreateSession(s.sessions, date, dayKey)
          return { sessions: { ...s.sessions, [date]: { ...sess, mode } } }
        }),

      duplicateRoutine: (fromKey, toKey) =>
        set((s) => {
          const from = s.plan.find((d) => d.key === fromKey)
          if (!from) return {}
          return {
            plan: s.plan.map((d) =>
              d.key !== toKey
                ? d
                : { ...d, exercises: from.exercises.map((e) => ({ ...e, id: uid() })) },
            ),
          }
        }),

      saveFavMeal: (name, meal, items) =>
        set((s) => ({ favMeals: [...s.favMeals, { id: uid(), name, meal, items }] })),
      removeFavMeal: (id) =>
        set((s) => ({ favMeals: s.favMeals.filter((f) => f.id !== id) })),

      setGarminDemo: (demo) =>
        set((s) => ({ garmin: { ...s.garmin, demo, connected: demo ? true : s.garmin.connected } })),
      disconnectGarmin: () =>
        set(() => ({ garmin: { connected: false, demo: false, daily: {}, activities: [] } })),
      applyGarminSync: (daily, activities, syncedAt) =>
        set((s) => {
          const merged = [...s.garmin.activities.filter((a) => !activities.some((n) => n.id === a.id)), ...activities]
          return {
            garmin: {
              ...s.garmin,
              daily: { ...s.garmin.daily, ...daily },
              activities: merged.sort((a, b) => a.date.localeCompare(b.date)),
              lastSync: syncedAt,
            },
          }
        }),

      setStravaDemo: (demo) =>
        set((s) => ({ strava: { ...s.strava, demo, connected: demo ? true : s.strava.connected } })),
      setStravaConnected: (connected) =>
        set((s) => ({ strava: { ...s.strava, connected, demo: connected ? false : s.strava.demo } })),
      disconnectStrava: () =>
        set(() => ({ strava: { connected: false, demo: false, activities: [] } })),
      applyStravaSync: (activities, syncedAt) =>
        set((s) => ({
          strava: {
            ...s.strava,
            activities: [...s.strava.activities.filter((a) => !activities.some((n) => n.id === a.id)), ...activities]
              .sort((a, b) => a.date.localeCompare(b.date)),
            lastSync: syncedAt,
          },
        })),

      setAppleDemo: (demo) =>
        set((s) => ({ apple: { ...s.apple, demo, connected: demo ? true : s.apple.connected } })),
      disconnectApple: () =>
        set(() => ({ apple: { connected: false, demo: false, daily: {}, activities: [] } })),
      applyAppleSync: (daily, activities, syncedAt) =>
        set((s) => ({
          apple: {
            ...s.apple,
            daily: { ...s.apple.daily, ...daily },
            activities: [...s.apple.activities.filter((a) => !activities.some((n) => n.id === a.id)), ...activities]
              .sort((a, b) => a.date.localeCompare(b.date)),
            lastSync: syncedAt,
          },
        })),

      markGarminSent: (date) =>
        set((s) => ({ garminSent: { ...s.garminSent, [date]: new Date().toISOString() } })),
    }),
    {
      name: 'reset78-store',
      version: 2,
      // v2: el plan de entrenamiento pasó a bloques con tiempos (≤75 min).
      // Se reemplaza el plan guardado por el nuevo; el resto de datos queda intacto.
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Partial<State>
        if (version < 2) return { ...state, plan: WORKOUT_PLAN }
        return state
      },
    },
  ),
)

// ---------- Selectores útiles ----------
export const allFoods = (s: State): Food[] => [...FOODS, ...s.customFoods]

export const currentWeight = (s: State): number => {
  const dates = Object.keys(s.checkIns)
    .filter((d) => s.checkIns[d].weight)
    .sort()
  if (dates.length === 0) return s.profile.startWeight
  return s.checkIns[dates[dates.length - 1]].weight!
}

export const mealsForDate = (s: State, date: string) => s.meals.filter((m) => m.date === date)

/** Entreno que corresponde a una fecha, respetando movimientos hechos desde el calendario */
export const workoutForDate = (s: State, date: string): WorkoutDay => {
  const override = s.dayOverrides[date]
  if (override) {
    const day = s.plan.find((d) => d.key === override)
    if (day) return day
  }
  const idx = ((new Date(date + 'T12:00:00').getDay() + 6) % 7)
  return s.plan.find((d) => d.dayIndex === idx)!
}

export const macrosForDate = (s: State, date: string) => {
  const list = mealsForDate(s, date)
  return {
    kcal: Math.round(list.reduce((a, m) => a + m.kcal, 0)),
    protein: Math.round(list.reduce((a, m) => a + m.protein, 0)),
    carbs: Math.round(list.reduce((a, m) => a + m.carbs, 0)),
    fat: Math.round(list.reduce((a, m) => a + m.fat, 0)),
  }
}

export { todayStr }
