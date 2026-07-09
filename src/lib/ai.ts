// Adaptador de "coach inteligente".
// Hoy: 100% reglas locales (ver calc.ts). Mañana: se conecta una API de IA
// implementando esta misma interfaz, sin tocar las pantallas.

import type { Profile, CheckIn, MealEntry, Session, WorkoutDay, Targets } from '../types'
import { dailyInsights, suggestProgression, type Insight } from './calc'

export interface CoachContext {
  profile: Profile
  targets: Targets
  checkIns: Record<string, CheckIn>
  meals: MealEntry[]
  sessions: Record<string, Session>
  plan: WorkoutDay[]
  date: string
}

export interface CoachAdapter {
  getInsights(ctx: CoachContext): Promise<Insight[]>
  getProgression(ctx: CoachContext, exerciseId: string): Promise<{ action: string; message: string } | null>
  // Futuro (API de IA): generateRoutine, adjustCalories, createRecipe, analyzeProgress
}

export const rulesCoach: CoachAdapter = {
  async getInsights(ctx) {
    return dailyInsights({ checkIns: ctx.checkIns, meals: ctx.meals, targets: ctx.targets, date: ctx.date })
  },
  async getProgression(ctx, exerciseId) {
    const history = Object.values(ctx.sessions)
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((sess) => sess.logs[exerciseId])
      .map((sess) => ({ log: sess.logs[exerciseId] }))
    return suggestProgression(history)
  },
}

// Punto único de intercambio: cambiar esta línea para conectar IA real.
export const coach: CoachAdapter = rulesCoach
