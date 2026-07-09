export type MealType = 'desayuno' | 'almuerzo' | 'cena' | 'snack' | 'bebida'

export interface Food {
  id: string
  name: string
  portion: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  category: string
  custom?: boolean
}

export interface MealEntry {
  id: string
  date: string // YYYY-MM-DD
  meal: MealType
  name: string
  qty: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export type ExerciseType = 'fuerza' | 'cardio' | 'funcional' | 'movilidad'

export type BlockType = 'calentamiento' | 'principal' | 'accesorio' | 'cardio' | 'core' | 'movilidad'

export interface Exercise {
  id: string
  name: string
  muscle: string
  sets: number
  reps: string
  rest: string
  cue: string
  type: ExerciseType
  block?: BlockType // bloque dentro de la sesión (default: principal)
  estMin?: number // minutos estimados del ejercicio completo
}

export interface WorkoutDay {
  key: string
  dayIndex: number // 0=Lunes ... 6=Domingo
  title: string
  focus: string
  color: string
  exercises: Exercise[]
}

export interface SetLog {
  reps: number | ''
  weight: number | ''
}

export interface ExerciseLog {
  completed: boolean
  sets: SetLog[]
  rpe?: number
  notes?: string
}

export interface CardioLog {
  distance?: number
  time?: number
  pace?: string
  feel?: number
}

export type SessionMode = 'normal' | 'rapida' | 'ligera'

export interface Session {
  date: string
  dayKey: string
  logs: Record<string, ExerciseLog>
  done: boolean
  cardio?: CardioLog
  notes?: string
  mode?: SessionMode
}

export interface CheckIn {
  date: string
  weight?: number
  sleep?: number
  energy?: number
  hunger?: number
  stress?: number
  trainingDone: boolean
  nutritionDone: boolean
  waterDone: boolean
  steps?: number
  note?: string
}

export interface Measurement {
  date: string
  cintura?: number
  pecho?: number
  abdomen?: number
  cadera?: number
  brazo?: number
  pierna?: number
}

export interface RecipeIngredient {
  name: string
  qty: string
  category: string
}

export type RecipeCategory = 'desayuno' | 'almuerzo' | 'cena' | 'snack' | 'post-entreno'

export interface Recipe {
  id: string
  name: string
  meal: MealType
  kcal: number
  protein: number
  carbs: number
  fat: number
  time: number
  difficulty: 'fácil' | 'media'
  tags: string[]
  ingredients: RecipeIngredient[]
  steps: string[]
  swaps?: string
  num?: number // número en el menú RESET78 (para el mapeo de sugerencias)
  category?: RecipeCategory
  idealFor?: string[] // fuerza | pierna | running | funcional | descanso | rápida...
}

export interface GroceryItem {
  id: string
  name: string
  qty: string
  category: string
  checked: boolean
}

export interface Profile {
  name: string
  age: number
  sex: 'M' | 'F'
  height: number // cm
  startWeight: number
  goalWeight: number
  activityLevel: 'sedentario' | 'ligero' | 'moderado' | 'alto'
  trainingDays: number
  injuries: string
  trainingPrefs: string[]
  experience: 'principiante' | 'intermedio' | 'avanzado'
  sleepHours: number
  stressLevel: number
  foodPrefs: string
  foodAllergies: string
  foodDislikes: string
  waterGoal: number // vasos
  onboarded: boolean
}

export interface Targets {
  maintenance: number
  deficit: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

// ---------- Comidas favoritas y rápidas ----------
export interface FavMealItem {
  name: string
  qty: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface FavMeal {
  id: string
  name: string
  meal: MealType
  items: FavMealItem[]
}

// ---------- Garmin ----------
export interface GarminDaily {
  date: string
  steps: number
  sleepHours: number
  stress: number // 0-100
  bodyBattery: number // 0-100
  activeCalories: number
  restingHR: number
}

export type GarminActivityType = 'running' | 'strength' | 'functional' | 'walking'

export interface GarminActivity {
  id: string
  date: string
  type: GarminActivityType
  name: string
  durationMin: number
  distanceKm?: number
  paceMinKm?: string
  avgHR?: number
  calories: number
}

export interface GarminState {
  connected: boolean
  demo: boolean
  lastSync?: string
  daily: Record<string, GarminDaily>
  activities: GarminActivity[]
}

// ---------- Fuentes de actividad unificadas ----------
export type ActivitySource = 'garmin' | 'strava' | 'apple' | 'manual'

export interface UnifiedActivity {
  id: string
  date: string
  source: ActivitySource
  type: GarminActivityType
  name: string
  durationMin: number
  distanceKm?: number
  paceMinKm?: string
  avgHR?: number
  calories?: number
}

export interface StravaState {
  connected: boolean
  demo: boolean
  lastSync?: string
  activities: UnifiedActivity[]
}

export interface AppleDaily {
  date: string
  steps: number
  activeCalories: number
  sleepHours: number
  restingHR?: number
  weight?: number
}

export interface AppleHealthState {
  connected: boolean
  demo: boolean
  lastSync?: string
  daily: Record<string, AppleDaily>
  activities: UnifiedActivity[]
}
