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

// ---------- Peso recomendado por el coach (rango, no número absoluto) ----------
export interface WeightRange {
  healthyLo: number // IMC 18.5
  healthyHi: number // IMC 24.9
  recLo: number // rango recomendado por coach (IMC 22–24 para alguien que entrena fuerza)
  recHi: number
  idealFormula: number // Devine ajustada, referencia
}

export function recommendedWeight(p: Profile): WeightRange {
  const h2 = (p.height / 100) ** 2
  const healthyLo = Math.round(18.5 * h2)
  const healthyHi = Math.round(24.9 * h2)
  // Para quien entrena fuerza, un IMC 22–24 es más realista que apuntar a 18.5:
  // el músculo pesa. Rango recomendado sobre esa banda.
  const recLo = Math.round(22 * h2)
  const recHi = Math.round(24 * h2)
  // Fórmula Devine (referencia clásica), hombre: 50 + 2.3 kg por pulgada sobre 152.4cm
  const inchesOver = Math.max(0, (p.height - 152.4) / 2.54)
  const idealFormula = Math.round((p.sex === 'M' ? 50 : 45.5) + 2.3 * inchesOver)
  return { healthyLo, healthyHi, recLo, recHi, idealFormula }
}

export type GoalVerdict = 'agresivo' | 'razonable' | 'conservador' | 'bajo-peso'

export interface CoachDiagnosis {
  verdict: GoalVerdict
  range: WeightRange
  goalAssessment: string
  strategy: string
  pace: string
  trainingFocus: string
  nutritionFocus: string
  risks: string[]
  nextAdjustment: string
}

export function coachDiagnosis(p: Profile, currentWeight: number, targets: Targets): CoachDiagnosis {
  const range = recommendedWeight(p)
  const goalBmi = bmi(p.goalWeight, p.height)
  const plan = lossPlan(currentWeight, p.goalWeight)

  // Veredicto sobre el objetivo elegido por el usuario
  let verdict: GoalVerdict
  let goalAssessment: string
  if (goalBmi < 18.5) {
    verdict = 'bajo-peso'
    goalAssessment = `Tu objetivo de ${p.goalWeight} kg te dejaría en IMC ${goalBmi} (bajo peso). Sube la meta al rango ${range.recLo}–${range.recHi} kg — ahí te ves y rindes mejor.`
  } else if (p.goalWeight < range.recLo) {
    verdict = 'agresivo'
    goalAssessment = `${p.goalWeight} kg es ambicioso: queda por debajo del rango recomendado (${range.recLo}–${range.recHi} kg) para alguien que entrena fuerza. Alcanzable, pero cuida el músculo y no tengas prisa.`
  } else if (p.goalWeight > range.healthyHi) {
    verdict = 'conservador'
    goalAssessment = `${p.goalWeight} kg es un buen primer objetivo, pero aún queda sobre el rango saludable (${range.healthyLo}–${range.healthyHi} kg). Cúmplelo y define una etapa 2 hacia ${range.recHi} kg.`
  } else {
    verdict = 'razonable'
    goalAssessment = `${p.goalWeight} kg es un objetivo razonable: cae dentro del rango saludable y cerca del recomendado (${range.recLo}–${range.recHi} kg). Prioridad: perder grasa sin sacrificar músculo.`
  }

  // Estrategia según cuánto falta por bajar
  const toLose = plan.toLose
  const strategy =
    toLose > 12
      ? 'Tienes recorrido: déficit moderado sostenido + cardio controlado. Divide la meta en etapas de 5 kg y celebra cada una.'
      : toLose > 5
        ? 'Déficit moderado del 20%, proteína alta y fuerza 3×/semana. El cardio suave acelera sin robar recuperación.'
        : 'Estás cerca: los últimos kilos son los lentos. Mantén el rumbo, no aprietes el déficit — la paciencia gana aquí.'

  const trainingFocus =
    p.trainingPrefs.includes('running')
      ? `${Math.min(p.trainingDays, 3)} días de fuerza + 1 running semanal mínimo + 1 cardio suave. No necesitas matarte con cardio: necesitas constancia, fuerza y déficit.`
      : `${Math.min(p.trainingDays, 3)} días de fuerza como base + caminata/zona 2 para el gasto extra. El músculo se protege levantando, no corriendo.`

  const nutritionFocus = `Objetivo ${targets.kcal} kcal · ${targets.protein}g proteína (la innegociable) · ${targets.carbs}g carbos alrededor del entreno · ${targets.fat}g grasas. La proteína alta protege la masa muscular en déficit.`

  const risks: string[] = []
  const pctDeficit = targets.deficit / targets.maintenance
  if (pctDeficit > 0.25) risks.push('El déficit supera el 25% — agresivo para sostener fuerza. Considera +100-150 kcal.')
  if (p.sleepHours < 6.5) risks.push(`Duermes ${p.sleepHours}h en promedio. Poco sueño sabotea la pérdida de grasa y la recuperación — es tu palanca #1.`)
  if (p.stressLevel >= 8) risks.push(`Estrés alto (${p.stressLevel}/10): puede frenar la báscula por retención. No te asustes si el peso se estanca días.`)
  if (verdict === 'agresivo') risks.push('Si bajas más de 1 kg/semana de forma sostenida, sube calorías o baja intensidad: probablemente estés perdiendo músculo.')
  if (risks.length === 0) risks.push('Sin banderas rojas. Tu plan es sostenible — el único riesgo real es la inconsistencia.')

  const nextAdjustment =
    'Si en 2 semanas el promedio de peso no baja, primero sumamos ~2.000 pasos diarios; si sigue plano, recortamos 100-150 kcal. Un cambio a la vez.'

  return {
    verdict, range, goalAssessment, strategy,
    pace: `${plan.rateRange} · ~${plan.weeks} semanas hasta ${p.goalWeight} kg (${plan.etaLabel})`,
    trainingFocus, nutritionFocus, risks, nextAdjustment,
  }
}
