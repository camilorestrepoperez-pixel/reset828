// Lectura semanal del coach: qué va bien, qué falla, qué ajustar.
import type { CheckIn, Session, MealEntry, Targets, Profile } from '../types'
import { addDays, todayStr } from './calc'

export interface WeekReport {
  bien: string[]
  mal: string[]
  ajustar: string[]
}

export function buildWeekReport(opts: {
  profile: Profile
  targets: Targets
  checkIns: Record<string, CheckIn>
  sessions: Record<string, Session>
  meals: MealEntry[]
}): WeekReport {
  const { profile, targets, checkIns, sessions, meals } = opts
  const today = todayStr()
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -6 + i))

  const bien: string[] = []
  const mal: string[] = []
  const ajustar: string[] = []

  // Entrenos
  const trained = days.filter((d) => sessions[d]?.done || checkIns[d]?.trainingDone).length
  if (trained >= Math.min(profile.trainingDays, 5)) bien.push(`${trained} entrenos en 7 días. La base está firme.`)
  else if (trained >= 3) bien.push(`${trained} entrenos esta semana. Aceptable, no sobresaliente.`)
  else {
    mal.push(`Solo ${trained} ${trained === 1 ? 'entreno' : 'entrenos'} en 7 días.`)
    ajustar.push('Agenda los entrenos como reuniones: hora fija, no negociable.')
  }

  // Nutrición
  const daysLogged = days.filter((d) => meals.some((m) => m.date === d))
  if (daysLogged.length >= 5) {
    const avgKcal = Math.round(
      daysLogged.reduce((a, d) => a + meals.filter((m) => m.date === d).reduce((x, m) => x + m.kcal, 0), 0) / daysLogged.length,
    )
    const avgProt = Math.round(
      daysLogged.reduce((a, d) => a + meals.filter((m) => m.date === d).reduce((x, m) => x + m.protein, 0), 0) / daysLogged.length,
    )
    if (avgKcal <= targets.kcal * 1.05) bien.push(`Calorías promedio ${avgKcal} kcal — dentro del plan.`)
    else {
      mal.push(`Calorías promedio ${avgKcal} kcal, ${avgKcal - targets.kcal} por encima del objetivo.`)
      ajustar.push('Recorta el bloque más flojo (normalmente snacks nocturnos o bebidas).')
    }
    if (avgProt >= targets.protein * 0.85) bien.push(`Proteína promedio ${avgProt}g. El músculo está protegido.`)
    else {
      mal.push(`Proteína promedio ${avgProt}g de ${targets.protein}g.`)
      ajustar.push('Suma una fuente de proteína fija al desayuno (pericos, yogur griego o whey).')
    }
  } else if (daysLogged.length > 0) {
    mal.push(`Solo registraste comida ${daysLogged.length} de 7 días. Sin datos no hay coach.`)
    ajustar.push('Registra al menos almuerzo y cena todos los días — 30 segundos por comida.')
  } else {
    mal.push('Cero comidas registradas esta semana.')
    ajustar.push('Empieza hoy: registra solo la cena. Un hábito a la vez.')
  }

  // Peso
  const weights = days.map((d) => checkIns[d]?.weight).filter((x): x is number => !!x)
  if (weights.length >= 3) {
    const diff = weights[weights.length - 1] - weights[0]
    if (diff <= -0.3 && diff >= -1.2) bien.push(`Peso: ${diff.toFixed(1)} kg esta semana. Ritmo perfecto.`)
    else if (diff < -1.2) {
      mal.push(`Bajaste ${Math.abs(diff).toFixed(1)} kg en una semana. Demasiado rápido.`)
      ajustar.push('Sube ~150 kcal/día esta semana. Perder músculo no es la meta.')
    } else if (diff > 0.3) {
      mal.push(`El peso subió ${diff.toFixed(1)} kg esta semana.`)
      ajustar.push('Revisa porciones de carbos y bebidas. Pésate en ayunas siempre.')
    }
  } else {
    ajustar.push('Pésate mínimo 3 mañanas por semana para tener tendencia real.')
  }

  // Sueño
  const sleeps = days.map((d) => checkIns[d]?.sleep).filter((x): x is number => !!x && x > 0)
  if (sleeps.length >= 3) {
    const avg = sleeps.reduce((a, b) => a + b, 0) / sleeps.length
    if (avg >= 7) bien.push(`Sueño promedio ${avg.toFixed(1)}h. La recuperación acompaña.`)
    else if (avg < 6.5) {
      mal.push(`Sueño promedio ${avg.toFixed(1)}h. Ahí se te fuga el progreso.`)
      ajustar.push('Pantallas fuera 30 min antes de dormir. El déficit se sostiene durmiendo.')
    }
  }

  if (bien.length === 0) bien.push('Estás aquí leyendo esto. Eso ya es más que la semana pasada.')
  if (ajustar.length === 0) ajustar.push('Nada que ajustar. Repite la semana tal cual.')

  return { bien, mal, ajustar }
}
