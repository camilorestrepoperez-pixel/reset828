// Métricas corporales: IMC, ritmo de pérdida y alertas de déficit.
import type { Profile, Targets } from '../types'

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100
  return Math.round((weightKg / (m * m)) * 10) / 10
}

export function bmiClass(v: number): { label: string; color: string } {
  if (v < 18.5) return { label: 'Bajo peso', color: '#38bdf8' }
  if (v < 25) return { label: 'Peso saludable', color: '#b4f629' }
  if (v < 30) return { label: 'Sobrepeso', color: '#fbbf24' }
  if (v < 35) return { label: 'Obesidad I', color: '#fb923c' }
  return { label: 'Obesidad II+', color: '#ef4444' }
}

/** Ritmo sostenible y fecha estimada de llegada al peso meta */
export function lossPlan(currentWeight: number, goalWeight: number) {
  const toLose = Math.max(0, currentWeight - goalWeight)
  const ratePerWeek = 0.65 // punto medio del rango sano 0.5–0.8 kg/sem
  const weeks = toLose > 0 ? Math.ceil(toLose / ratePerWeek) : 0
  const eta = new Date()
  eta.setDate(eta.getDate() + weeks * 7)
  return {
    toLose: Math.round(toLose * 10) / 10,
    rateRange: '0.5–0.8 kg/semana',
    weeks,
    etaLabel: toLose > 0 ? eta.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }) : '—',
  }
}

/** Alertas si el plan calórico queda agresivo para el perfil */
export function deficitAlerts(p: Profile, currentWeight: number, targets: Targets): string[] {
  const alerts: string[] = []
  const floor = p.sex === 'M' ? 1700 : 1400
  if (targets.kcal <= floor) {
    alerts.push(`El objetivo tocó el piso de seguridad (${floor} kcal). No bajes de ahí: menos comida = menos músculo, no más grasa.`)
  }
  const pctDeficit = targets.deficit / targets.maintenance
  if (pctDeficit > 0.25) {
    alerts.push('El déficit supera el 25%. Agresivo para sostener fuerza — considera subir ~100-150 kcal.')
  }
  if (p.goalWeight < 0.85 * (currentWeight)) {
    alerts.push('La meta está a más del 15% de tu peso actual. Válida, pero divídela en etapas de 5 kg.')
  }
  const goalBmi = bmi(p.goalWeight, p.height)
  if (goalBmi < 18.5) {
    alerts.push(`Con ${p.goalWeight} kg tu IMC quedaría en ${goalBmi} (bajo peso). Revisa la meta.`)
  }
  return alerts
}

/** Recomendaciones según el objetivo (pérdida de grasa + fuerza) */
export function goalRecommendations(p: Profile, targets: Targets): string[] {
  return [
    `Proteína primero: ${targets.protein}g diarios repartidos en 4 comidas (~${Math.round(targets.protein / 4)}g por comida).`,
    `Entrena fuerza ${Math.min(p.trainingDays, 3)}× por semana como mínimo — en déficit, el músculo que no usas se va.`,
    'Pésate en ayunas 3+ veces por semana y mira el promedio semanal, no el número del día.',
    'El cardio suave (zona 2) quema grasa sin robarle recuperación a la fuerza. El running de intervalos mejora condición.',
    `Ritmo objetivo: 0.5–0.8 kg/semana. Más rápido que eso no es disciplina, es pérdida de músculo.`,
  ]
}
