import { Link } from 'react-router-dom'
import { useStore, currentWeight, macrosForDate, workoutForDate, mealsForDate } from '../store/useStore'
import {
  todayStr, formatDate, calcTargets, calcStreak,
  weekAdherence, dailyMessage, dailyInsights, addDays, weekStart, DAY_NAMES,
} from '../lib/calc'
import { useState } from 'react'
import { getDayInfo, STATUS_COLORS } from '../lib/calendar'
import { recoveryStatus } from '../services/garmin/garminHealthMapper'
import { dailyMetrics } from '../services/healthDataMapper'
import { unifiedActivities, SOURCE_META } from '../services/unifiedActivityService'
import { sendWorkoutToGarmin } from '../services/garmin/garminTrainingService'
import { buildMealSuggestion } from '../lib/mealCoach'
import { bmi, bmiClass } from '../lib/body'
import { Card, CardTitle, ProgressBar, Stat, Chip, Button } from '../components/ui'

export default function Dashboard() {
  const s = useStore()
  const today = todayStr()
  const weight = currentWeight(s)
  const targets = calcTargets(s.profile, weight)
  const macros = macrosForDate(s, today)
  const workoutDay = workoutForDate(s, today)
  const session = s.sessions[today]
  const water = s.water[today] ?? 0
  const checkIn = s.checkIns[today]
  const streak = calcStreak(s.checkIns)
  const adherence = weekAdherence(s.checkIns, today)
  const insights = dailyInsights({ checkIns: s.checkIns, meals: s.meals, targets, date: today })

  const totalToLose = s.profile.startWeight - s.profile.goalWeight
  const lost = Math.max(0, s.profile.startWeight - weight)
  const pctToGoal = Math.min(100, (lost / totalToLose) * 100)

  const doneExercises = session ? Object.values(session.logs).filter((l) => l.completed).length : 0

  // Métricas de hoy desde la fuente unificada (Garmin > Apple > manual)
  const gToday = s.garmin.daily[today]
  const recovery = recoveryStatus(gToday)
  const metrics = dailyMetrics({ date: today, garmin: s.garmin, apple: s.apple, checkIn })
  const imc = bmi(weight, s.profile.height)
  const imcCls = bmiClass(imc)
  const [sendMsg, setSendMsg] = useState('')

  const sendToday = async () => {
    setSendMsg('Enviando...')
    const res = await sendWorkoutToGarmin(workoutDay, today, s.garmin.demo)
    if (res.ok) s.markGarminSent(today)
    setSendMsg(res.ok ? '✓ Enviado a Garmin' : res.message)
  }

  // Próximo entrenamiento (mañana)
  const tomorrow = addDays(today, 1)
  const nextWorkout = workoutForDate(s, tomorrow)

  // Sugerencia de comida cruzada con el entreno de hoy
  const mealSug = buildMealSuggestion({
    day: workoutDay, date: today, checkIn, garminDaily: gToday, session,
    targets, todayMeals: mealsForDate(s, today),
  })
  const mealLine = mealSug.alerts[0]
    ?? (mealSug.meals.almuerzo && macros.kcal < targets.kcal * 0.4
      ? `Almuerzo sugerido: ${mealSug.meals.almuerzo.name}`
      : `Cena sugerida: ${mealSug.meals.cena?.name}`)

  const menuRows: [string, typeof mealSug.meals.desayuno][] = [
    ['Desayuno', mealSug.meals.desayuno],
    ['Almuerzo', mealSug.meals.almuerzo],
    ['Cena', mealSug.meals.cena],
    ['Snack', mealSug.meals.snack],
    ...(mealSug.preEntreno ? [['Pre-running', mealSug.preEntreno] as [string, typeof mealSug.preEntreno]] : []),
    ...(mealSug.postEntreno ? [['Post-entreno', mealSug.postEntreno] as [string, typeof mealSug.postEntreno]] : []),
  ]

  // Resumen semanal
  const ws = weekStart(today)
  let trainedDays = 0
  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i)
    if (s.sessions[d]?.done || s.checkIns[d]?.trainingDone) trainedDays++
  }

  const cardio = workoutDay.exercises.filter((e) => e.type === 'cardio')

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-mut capitalize">{formatDate(today)}</div>
        <h1 className="text-2xl font-black mt-1">{dailyMessage(today)}</h1>
      </div>

      {/* HOY TOCA */}
      <Card className="border-acid/40">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-acid mb-1">Hoy toca</div>
            <div className="text-lg font-black">{workoutDay.title}</div>
            <div className="text-xs text-mut">
              {workoutDay.focus}
              {cardio.length > 0 && ` · ${cardio[0].name} (${cardio[0].reps})`}
            </div>
            {recovery && (
              <div className="text-xs mt-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: recovery.color }} />
                <span className="text-zinc-300">{recovery.message}</span>
              </div>
            )}
            <Link to="/nutricion" className="text-xs mt-1.5 flex items-start gap-1.5 group">
              <span>🍽</span>
              <span className="text-zinc-300 group-hover:text-acid transition">{mealLine}</span>
            </Link>
            {(() => {
              const run = s.sessions[today]?.cardio
              if (!run?.time && !run?.distance) return null
              const pace = run.pace ?? (run.time && run.distance ? (() => { const p = run.time / run.distance; return `${Math.floor(p)}:${String(Math.round((p % 1) * 60)).padStart(2, '0')}` })() : null)
              return (
                <div className="text-xs mt-1.5 flex items-start gap-1.5">
                  <span>🏃</span>
                  <span className="text-acid font-semibold">
                    Real: {run.time ? `${run.time} min` : ''}{run.distance ? ` · ${run.distance} km` : ''}{pace ? ` · ${pace}/km` : ''}{run.calories ? ` · ${run.calories} kcal` : ''} · {run.source ?? 'manual'}
                  </span>
                </div>
              )
            })()}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Link to="/entreno"><Button className="w-full !py-2 !text-xs">Ir al entreno</Button></Link>
            <Link to="/checkin"><Button variant="ghost" className="w-full !py-2 !text-xs">{checkIn ? '✓ Check-in' : 'Check-in'}</Button></Link>
            {s.garmin.connected && (
              <Button variant="ghost" className="w-full !py-2 !text-xs" onClick={sendToday}>
                {s.garminSent[today] ? '✓ En Garmin' : '📤 → Garmin'}
              </Button>
            )}
          </div>
        </div>
        {/* Mini calendario semanal */}
        <div className="grid grid-cols-7 gap-1 mt-4 pt-3 border-t border-line/60">
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(ws, i)
            const info = getDayInfo(d, s.checkIns, s.sessions, s.meals)
            const isToday = d === today
            return (
              <Link
                key={d}
                to="/calendario"
                className={`flex flex-col items-center gap-1 py-1.5 rounded-lg ${isToday ? 'bg-acid/10' : ''}`}
              >
                <span className={`text-[10px] ${isToday ? 'text-acid font-bold' : 'text-mut'}`}>{DAY_NAMES[i].slice(0, 1)}</span>
                <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[info.status] }} />
              </Link>
            )
          })}
        </div>
      </Card>

      {/* Peso y meta */}
      <Card>
        <div className="flex items-end justify-between mb-3">
          <Stat label="Peso actual" value={<>{weight.toFixed(1)} <span className="text-sm text-mut">kg</span></>} />
          <Stat label="IMC" value={<span style={{ color: imcCls.color }}>{imc}</span>} sub={imcCls.label} />
          <Stat label="Perdido" value={<span className="text-acid">{lost > 0 ? `-${lost.toFixed(1)}` : '0.0'} kg</span>} />
          <Stat label="Meta" value={<>{s.profile.goalWeight} <span className="text-sm text-mut">kg</span></>} />
        </div>
        <ProgressBar value={lost} max={totalToLose} h="h-3" />
        <div className="flex justify-between text-[11px] text-mut mt-1.5">
          <span>{s.profile.startWeight} kg</span>
          <span className="text-acid font-semibold">{pctToGoal.toFixed(0)}% del camino</span>
          <span>{s.profile.goalWeight} kg</span>
        </div>
      </Card>

      {/* Menú de hoy según el entreno */}
      <Card>
        <CardTitle right={<Link to="/nutricion" className="text-xs text-acid font-semibold">Registrar →</Link>}>
          Menú de hoy — {mealSug.type}
        </CardTitle>
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {menuRows.map(([label, r]) =>
            r ? (
              <div key={label} className="flex items-baseline gap-2 text-sm min-w-0">
                <span className="text-[10px] text-mut uppercase tracking-wider w-20 shrink-0">{label}</span>
                <span className="truncate text-zinc-300">{r.name}</span>
                <span className="text-[10px] text-mut shrink-0 ml-auto">{r.protein}P</span>
              </div>
            ) : null,
          )}
        </div>
        {mealSug.quick.length > 0 && (
          <div className="text-[11px] text-mut mt-2.5 pt-2 border-t border-line/60">
            ⏱ Sin tiempo hoy: {mealSug.quick.map((r) => r.name).join(' · ')}
          </div>
        )}
      </Card>

      {/* Insights del coach */}
      <Card>
        <CardTitle>Coach</CardTitle>
        <div className="space-y-2">
          {insights.slice(0, 3).map((ins, i) => (
            <div key={i} className="flex gap-2 items-start text-sm">
              <span className={ins.level === 'ok' ? 'text-emerald-400' : ins.level === 'warn' ? 'text-amber-400' : 'text-acid'}>
                {ins.level === 'ok' ? '●' : '▲'}
              </span>
              <span className="text-zinc-300">{ins.text}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Macros del día */}
        <Card>
          <CardTitle right={<Link to="/nutricion" className="text-xs text-acid font-semibold">Registrar →</Link>}>
            Nutrición hoy
          </CardTitle>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-3xl font-black">{macros.kcal}</span>
            <span className="text-sm text-mut">/ {targets.kcal} kcal</span>
          </div>
          <div className="text-xs text-mut mb-3">
            {Math.max(0, targets.kcal - macros.kcal)} kcal · {Math.max(0, targets.protein - macros.protein)}g proteína restantes
          </div>
          <ProgressBar value={macros.kcal} max={targets.kcal} />
          <div className="grid grid-cols-3 gap-3 mt-4">
            {([
              ['Proteína', macros.protein, targets.protein, '#b4f629'],
              ['Carbos', macros.carbs, targets.carbs, '#60a5fa'],
              ['Grasas', macros.fat, targets.fat, '#fbbf24'],
            ] as const).map(([label, v, t, c]) => (
              <div key={label}>
                <div className="text-[11px] text-mut">{label}</div>
                <div className="text-sm font-bold">{v}<span className="text-mut font-normal">/{t}g</span></div>
                <ProgressBar value={v} max={t} color={c} h="h-1.5" />
              </div>
            ))}
          </div>
        </Card>

        {/* Entreno de hoy */}
        <Card>
          <CardTitle right={<Link to="/entreno" className="text-xs text-acid font-semibold">Abrir →</Link>}>
            Entreno hoy
          </CardTitle>
          <div className="font-bold text-lg">{workoutDay.title}</div>
          <div className="text-xs text-mut mb-2">{workoutDay.focus}</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {workoutDay.exercises.slice(0, 4).map((e) => (
              <Chip key={e.id}>{e.name.split(' ').slice(0, 3).join(' ')}</Chip>
            ))}
            {workoutDay.exercises.length > 4 && <Chip>+{workoutDay.exercises.length - 4}</Chip>}
          </div>
          <ProgressBar value={doneExercises} max={workoutDay.exercises.length} />
          <div className="text-xs text-mut mt-1.5">
            {session?.done
              ? '✅ Sesión completada'
              : `${doneExercises}/${workoutDay.exercises.length} ejercicios marcados`}
          </div>
          {(() => {
            const acts = unifiedActivities({ garmin: s.garmin, strava: s.strava, apple: s.apple, sessions: s.sessions, plan: s.plan })
            const todayAct = acts.find((a) => a.date === today)
            return todayAct ? (
              <div className="text-xs mt-2 pt-2 border-t border-line/60">
                <span className="text-mut">Real:</span> <span className="text-zinc-300">{todayAct.name}</span>
                <span className="text-mut"> · {todayAct.durationMin} min{todayAct.calories ? ` · ${todayAct.calories} kcal` : ''} · {SOURCE_META[todayAct.source].icon} {SOURCE_META[todayAct.source].label}</span>
              </div>
            ) : null
          })()}
          <div className="text-xs text-mut mt-2 pt-2 border-t border-line/60">
            Mañana: <span className="text-zinc-300">{nextWorkout.title}</span>
          </div>
        </Card>
      </div>

      {/* Cuerpo hoy: fuente unificada (Garmin > Apple > manual) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <Stat label="Pasos" value={metrics.steps ? metrics.steps.toLocaleString('es-CO') : '—'} sub={metrics.source !== 'ninguna' ? metrics.source : 'sin dato'} />
        </Card>
        <Card>
          <Stat label="Sueño" value={metrics.sleepHours ? `${metrics.sleepHours}h` : '—'} sub={metrics.source !== 'ninguna' ? metrics.source : 'check-in'} />
        </Card>
        <Card>
          <Stat label="Cal. activas" value={metrics.activeCalories ?? '—'} sub={metrics.source !== 'ninguna' ? metrics.source : 'sin dato'} />
        </Card>
        <Card>
          <Stat
            label="Body Battery"
            value={metrics.bodyBattery !== undefined ? <span style={{ color: metrics.bodyBattery >= 60 ? '#b4f629' : metrics.bodyBattery >= 35 ? '#fbbf24' : '#ef4444' }}>{metrics.bodyBattery}</span> : '—'}
            sub={metrics.bodyBattery !== undefined ? 'Garmin' : 'requiere Garmin'}
          />
        </Card>
      </div>

      {/* Conexiones */}
      <Card>
        <Link to="/garmin" className="flex items-center justify-between group">
          <div className="flex gap-4 flex-wrap text-sm">
            {([
              ['⌚ Garmin', s.garmin.connected, s.garmin.demo],
              ['🟠 Strava', s.strava.connected, s.strava.demo],
              ['🍎 Apple Health', s.apple.connected, s.apple.demo],
            ] as const).map(([label, conn, demo]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${conn ? 'bg-acid' : 'bg-zinc-600'}`} />
                <span className={conn ? 'text-zinc-200' : 'text-mut'}>{label}{demo ? ' (demo)' : ''}</span>
              </span>
            ))}
          </div>
          <span className="text-xs text-acid font-semibold group-hover:translate-x-0.5 transition">Gestionar →</span>
        </Link>
        {sendMsg && <div className="text-[11px] text-mut mt-2">{sendMsg}</div>}
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Agua */}
        <Card className="col-span-2 sm:col-span-2">
          <CardTitle>Agua</CardTitle>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => s.setWater(today, water - 1)} className="!px-3">−</Button>
            <div className="flex-1 text-center">
              <span className="text-2xl font-black text-sky-400">{water}</span>
              <span className="text-sm text-mut"> / {s.profile.waterGoal} vasos</span>
            </div>
            <Button onClick={() => s.setWater(today, water + 1)} className="!px-3 !bg-sky-400">+</Button>
          </div>
          <ProgressBar value={water} max={s.profile.waterGoal} color="#38bdf8" h="h-1.5" />
        </Card>

        <Card>
          <Stat label="Racha" value={<span className="text-acid">🔥 {streak}</span>} sub={streak === 1 ? 'día cumplido' : 'días cumplidos'} />
        </Card>
        <Card>
          <Stat label="Semana" value={`${adherence}%`} sub={`${trainedDays} entrenos`} />
        </Card>
      </div>

      {/* Check-in */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold">{checkIn ? 'Check-in de hoy ✅' : 'Check-in pendiente'}</div>
            <div className="text-xs text-mut mt-0.5">
              {checkIn
                ? `Energía ${checkIn.energy ?? '—'}/10 · Sueño ${checkIn.sleep ?? '—'}h · Estrés ${checkIn.stress ?? '—'}/10`
                : '2 minutos. Peso, energía, cumplimiento. No se negocia.'}
            </div>
          </div>
          <Link to="/checkin">
            <Button variant={checkIn ? 'ghost' : 'primary'}>{checkIn ? 'Editar' : 'Hacer ahora'}</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
