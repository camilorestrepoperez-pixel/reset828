// Garmin Training API: envía el entreno del día o el plan semanal al
// calendario de Garmin Connect (para que aparezca en el reloj).
// Modo demo: simula el envío. Modo real: requiere tokens OAuth + proxy backend
// (las llamadas a apis.garmin.com necesitan CORS/secret del lado servidor).
import type { WorkoutDay, Exercise } from '../../types'
import { getTokens, getConfig } from './garminAuthService'

interface GarminWorkoutStep {
  type: 'WorkoutStep'
  stepOrder: number
  intensity: 'WARMUP' | 'ACTIVE' | 'REST' | 'COOLDOWN'
  description: string
  durationType: 'TIME' | 'REPS' | 'OPEN'
  durationValue?: number
}

export interface GarminWorkoutPayload {
  workoutName: string
  sport: 'STRENGTH_TRAINING' | 'RUNNING' | 'CARDIO_TRAINING'
  description: string
  steps: GarminWorkoutStep[]
}

const intensityFor = (e: Exercise): GarminWorkoutStep['intensity'] => {
  if ((e.block ?? 'principal') === 'calentamiento') return 'WARMUP'
  if (e.block === 'movilidad') return 'COOLDOWN'
  return 'ACTIVE'
}

/** Mapea un día del plan RESET 828 al formato de workout de la Training API */
export function toGarminWorkout(day: WorkoutDay): GarminWorkoutPayload {
  const isRun = day.exercises.every((e) => e.type === 'cardio' || e.type === 'movilidad')
  return {
    workoutName: `RESET 828 — ${day.title}`,
    sport: isRun ? 'RUNNING' : day.exercises.some((e) => e.type === 'fuerza') ? 'STRENGTH_TRAINING' : 'CARDIO_TRAINING',
    description: day.focus,
    steps: day.exercises.map((e, i) => ({
      type: 'WorkoutStep',
      stepOrder: i + 1,
      intensity: intensityFor(e),
      description: `${e.name} — ${e.sets}×${e.reps} (desc. ${e.rest})`,
      durationType: e.estMin ? 'TIME' : 'OPEN',
      durationValue: e.estMin ? e.estMin * 60 : undefined,
    })),
  }
}

export interface SendResult {
  ok: boolean
  message: string
}

async function postToGarmin(payload: unknown, scheduleDate?: string): Promise<SendResult> {
  const tokens = getTokens()
  const proxy = getConfig().tokenProxy
  if (!tokens?.accessToken) {
    return { ok: false, message: 'Sin sesión Garmin activa. Conecta primero (o usa modo demo).' }
  }
  if (!proxy) {
    return { ok: false, message: 'Falta el proxy backend (VITE_GARMIN_TOKEN_PROXY) para llamar la Training API.' }
  }
  try {
    const res = await fetch(proxy.replace(/\/$/, '') + '/garmin/workout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.accessToken}` },
      body: JSON.stringify({ workout: payload, scheduleDate }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { ok: true, message: 'Entreno enviado a Garmin Connect.' }
  } catch (e) {
    return { ok: false, message: `Error enviando a Garmin: ${String(e)}` }
  }
}

export async function sendWorkoutToGarmin(day: WorkoutDay, date: string, demo: boolean): Promise<SendResult> {
  if (demo) {
    await new Promise((r) => setTimeout(r, 500))
    return { ok: true, message: `(demo) "${day.title}" programado en Garmin Connect para el ${date}.` }
  }
  return postToGarmin(toGarminWorkout(day), date)
}

export async function sendWeekToGarmin(
  days: { day: WorkoutDay; date: string }[],
  demo: boolean,
): Promise<SendResult> {
  if (demo) {
    await new Promise((r) => setTimeout(r, 800))
    const trainDays = days.filter(({ day }) => day.exercises.some((e) => e.type !== 'movilidad'))
    return { ok: true, message: `(demo) Plan semanal enviado: ${trainDays.length} entrenos programados en Garmin Connect Calendar.` }
  }
  for (const { day, date } of days) {
    const res = await postToGarmin(toGarminWorkout(day), date)
    if (!res.ok) return res
  }
  return { ok: true, message: `Plan semanal (${days.length} días) enviado a Garmin Connect Calendar.` }
}
