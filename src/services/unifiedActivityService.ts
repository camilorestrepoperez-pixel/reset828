// Fuente unificada de actividades realizadas.
// Consolida Garmin + Strava + Apple Health + registro manual, sin duplicados.
// Prioridad ante duplicado (misma fecha + mismo tipo): Strava (actividades) >
// Garmin > Apple > manual — Strava es la fuente designada para actividades;
// Garmin manda en salud/recuperación (ver healthDataMapper).
import type { GarminState, StravaState, AppleHealthState, Session, UnifiedActivity, WorkoutDay } from '../types'

const SOURCE_PRIORITY: Record<UnifiedActivity['source'], number> = {
  strava: 3,
  garmin: 2,
  apple: 1,
  manual: 0,
}

export function unifiedActivities(opts: {
  garmin: GarminState
  strava: StravaState
  apple: AppleHealthState
  sessions: Record<string, Session>
  plan: WorkoutDay[]
}): UnifiedActivity[] {
  const { garmin, strava, apple, sessions, plan } = opts
  const all: UnifiedActivity[] = []

  // Garmin
  for (const a of garmin.activities) {
    all.push({ id: a.id, date: a.date, source: 'garmin', type: a.type, name: a.name, durationMin: a.durationMin, distanceKm: a.distanceKm, paceMinKm: a.paceMinKm, avgHR: a.avgHR, calories: a.calories })
  }
  // Strava y Apple ya vienen unificadas
  all.push(...strava.activities, ...apple.activities)

  // Manual: sesiones terminadas en la app
  for (const sess of Object.values(sessions)) {
    if (!sess.done) continue
    const day = plan.find((d) => d.key === sess.dayKey)
    const isRun = !!sess.cardio?.distance
    all.push({
      id: `manual-${sess.date}`,
      date: sess.date,
      source: 'manual',
      type: isRun ? 'running' : day?.exercises.some((e) => e.type === 'funcional') ? 'functional' : 'strength',
      name: day?.title ?? 'Entreno RESET 828',
      durationMin: sess.cardio?.time ?? day?.exercises.reduce((a, e) => a + (e.estMin ?? 8), 0) ?? 60,
      distanceKm: sess.cardio?.distance,
      paceMinKm: sess.cardio?.pace,
    })
  }

  // Dedupe: misma fecha + mismo tipo → gana la fuente de mayor prioridad
  const byKey = new Map<string, UnifiedActivity>()
  for (const a of all) {
    const key = `${a.date}|${a.type}`
    const existing = byKey.get(key)
    if (!existing || SOURCE_PRIORITY[a.source] > SOURCE_PRIORITY[existing.source]) {
      byKey.set(key, a)
    }
  }
  return [...byKey.values()].sort((a, b) => b.date.localeCompare(a.date))
}

/** Comparación plan vs realidad: ¿lo planeado ese día se hizo? */
export function plannedVsDone(
  date: string,
  planned: WorkoutDay,
  activities: UnifiedActivity[],
): { planned: string; done?: UnifiedActivity; match: boolean } {
  const dayActs = activities.filter((a) => a.date === date)
  const isRunDay = planned.exercises.every((e) => e.type === 'cardio' || e.type === 'movilidad')
  const wanted: UnifiedActivity['type'][] = isRunDay
    ? ['running', 'walking']
    : planned.exercises.some((e) => e.type === 'funcional')
      ? ['functional', 'strength']
      : ['strength', 'functional']
  const done = dayActs.find((a) => wanted.includes(a.type)) ?? dayActs[0]
  return { planned: planned.title, done, match: !!done && wanted.includes(done.type) }
}

export const SOURCE_META: Record<UnifiedActivity['source'], { label: string; icon: string }> = {
  garmin: { label: 'Garmin', icon: '⌚' },
  strava: { label: 'Strava', icon: '🟠' },
  apple: { label: 'Apple', icon: '🍎' },
  manual: { label: 'Manual', icon: '✍️' },
}
