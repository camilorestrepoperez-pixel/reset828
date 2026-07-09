import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, workoutForDate, currentWeight } from '../store/useStore'
import { todayStr, weekdayIndex, DAY_NAMES, weekStart, addDays, calcTargets } from '../lib/calc'
import { buildMealSuggestion, weekSuggestionIngredients, DAY_TYPE_INFO } from '../lib/mealCoach'
import { Card, Chip, Button } from '../components/ui'

export default function WeekPlan() {
  const s = useStore()
  const today = todayStr()
  const todayIdx = weekdayIndex(today)
  const ws = weekStart(today)
  const targets = calcTargets(s.profile, currentWeight(s))
  const [added, setAdded] = useState(false)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(ws, i)
    return { date, day: workoutForDate(s, date) }
  })

  const addWeekGrocery = () => {
    const ingredients = weekSuggestionIngredients(weekDays, targets)
    s.addIngredientsToGrocery(ingredients)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black">Plan semanal</h1>
          <p className="text-sm text-mut mt-1">Entrenamiento + comidas sugeridas según cada tipo de día.</p>
        </div>
        <Button variant="ghost" onClick={addWeekGrocery}>
          {added ? '✓ Agregado al mercado' : '🛒 Mercado de la semana'}
        </Button>
      </div>

      <div className="space-y-3">
        {weekDays.map(({ date, day }) => {
          const session = s.sessions[date]
          const isToday = date === today
          const isPast = date < today
          const sug = buildMealSuggestion({ day, date, targets, todayMeals: [] })
          const info = DAY_TYPE_INFO[sug.type]
          const totalMin = day.exercises.reduce((a, e) => a + (e.estMin ?? 8), 0)
          const mealKcal = [sug.meals.desayuno, sug.meals.almuerzo, sug.meals.cena, sug.meals.snack]
            .reduce((a, r) => a + (r?.kcal ?? 0), 0)
          return (
            <Card key={date} className={isToday ? 'border-acid/50' : isPast && !session?.done ? 'opacity-70' : ''}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: day.color }}>
                  {DAY_NAMES[day.dayIndex]}
                </span>
                {isToday && <Chip tone="acid">HOY</Chip>}
                {session?.done && <Chip tone="ok">✓ Hecho</Chip>}
                <span className="ml-auto text-[11px] text-mut">{info.icon} {info.label}</span>
              </div>
              <Link to={isToday ? '/entreno' : `/entreno?d=${date}`} className="block group">
                <div className="font-bold mt-1 group-hover:text-acid transition">{day.title}</div>
                <div className="text-xs text-mut">{day.exercises.length} ejercicios · ~{totalMin} min</div>
              </Link>
              <div className="mt-2.5 pt-2.5 border-t border-line/60 text-xs text-mut space-y-0.5">
                <div className="text-[11px] text-zinc-500 italic mb-1">{sug.note}</div>
                <div><span className="text-zinc-400">Desayuno:</span> {sug.meals.desayuno?.name}</div>
                <div><span className="text-zinc-400">Almuerzo:</span> {sug.meals.almuerzo?.name}</div>
                <div><span className="text-zinc-400">Cena:</span> {sug.meals.cena?.name}</div>
                <div>
                  <span className="text-zinc-400">Snack:</span> {sug.meals.snack?.name}
                  {sug.preEntreno && <> · <span className="text-zinc-400">Pre-running:</span> {sug.preEntreno.name}</>}
                  {sug.postEntreno && <> · <span className="text-zinc-400">Post-entreno:</span> {sug.postEntreno.name}</>}
                </div>
                <div className="text-[11px]">≈ {mealKcal} kcal en comidas principales · objetivo {targets.kcal} kcal</div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
