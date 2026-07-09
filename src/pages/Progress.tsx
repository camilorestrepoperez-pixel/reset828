import { useMemo, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Cell } from 'recharts'
import { useStore, currentWeight, workoutForDate } from '../store/useStore'
import { todayStr, addDays, weekStart, weekAdherence, calcStreak, calcTargets, DAY_NAMES, weekdayIndex } from '../lib/calc'
import { buildWeekReport } from '../lib/weekReport'
import { unifiedActivities, plannedVsDone, SOURCE_META } from '../services/unifiedActivityService'
import { Card, CardTitle, Stat, Input, Button, Chip } from '../components/ui'
import type { Measurement } from '../types'

const TT_STYLE = { background: '#1e1e21', border: '1px solid #26262b', borderRadius: 12, fontSize: 12 } as const
const AXIS_TICK = { fill: '#8b8b93', fontSize: 11 } as const

export default function Progress() {
  const s = useStore()
  const today = todayStr()
  const weight = currentWeight(s)
  const streak = calcStreak(s.checkIns)

  const targets = calcTargets(s.profile, weight)
  const report = useMemo(
    () => buildWeekReport({ profile: s.profile, targets, checkIns: s.checkIns, sessions: s.sessions, meals: s.meals }),
    [s.profile, targets, s.checkIns, s.sessions, s.meals],
  )

  // Serie de peso + promedio móvil de 7 días (tendencia real, sin ruido diario)
  const weightData = useMemo(() => {
    const raw = Object.values(s.checkIns)
      .filter((c) => c.weight)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((c) => ({ fullDate: c.date, date: c.date.slice(5), peso: c.weight! }))
    return raw.map((p, i) => {
      const window7 = raw.filter(
        (q) => q.fullDate <= p.fullDate && q.fullDate >= addDays(p.fullDate, -6),
      )
      const avg = window7.reduce((a, q) => a + q.peso, 0) / window7.length
      return { ...p, promedio: Math.round(avg * 10) / 10 }
    })
  }, [s.checkIns])

  // Actividades unificadas (Garmin + Strava + Apple + manual, sin duplicados)
  const activities = useMemo(
    () => unifiedActivities({ garmin: s.garmin, strava: s.strava, apple: s.apple, sessions: s.sessions, plan: s.plan }),
    [s.garmin, s.strava, s.apple, s.sessions, s.plan],
  )

  // Plan vs realizado — últimos 7 días
  const planVsReal = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(today, -6 + i)
        return { date: d, ...plannedVsDone(d, workoutForDate(s, d), activities) }
      }),
    [s, activities, today],
  )

  // Últimos 14 días: kcal, proteína, pasos, sueño
  const dailySeries = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(today, -13 + i)
      const dayMeals = s.meals.filter((m) => m.date === d)
      const c = s.checkIns[d]
      const g = s.garmin.daily[d]
      return {
        date: d.slice(8), // día del mes
        kcal: Math.round(dayMeals.reduce((a, m) => a + m.kcal, 0)),
        proteina: Math.round(dayMeals.reduce((a, m) => a + m.protein, 0)),
        pasos: g?.steps ?? c?.steps ?? 0,
        sueno: g?.sleepHours ?? c?.sleep ?? 0,
      }
    })
  }, [s.meals, s.checkIns, s.garmin.daily, today])

  // Métricas de las últimas 4 semanas
  const weeks = useMemo(() => {
    const out: { label: string; avgWeight: string; avgKcal: number; avgProtein: number; trained: number; km: number; adherence: number }[] = []
    for (let w = 3; w >= 0; w--) {
      const start = addDays(weekStart(today), -7 * w)
      const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i)).filter((d) => d <= today)
      const weights = dates.map((d) => s.checkIns[d]?.weight).filter((x): x is number => !!x)
      const meals = s.meals.filter((m) => dates.includes(m.date))
      const daysWithMeals = new Set(meals.map((m) => m.date)).size
      const trained = dates.filter((d) => s.sessions[d]?.done || s.checkIns[d]?.trainingDone).length
      const km = dates.reduce((a, d) => a + (s.sessions[d]?.cardio?.distance ?? 0), 0)
      out.push({
        label: w === 0 ? 'Esta semana' : `Hace ${w} sem`,
        avgWeight: weights.length ? (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1) : '—',
        avgKcal: daysWithMeals ? Math.round(meals.reduce((a, m) => a + m.kcal, 0) / daysWithMeals) : 0,
        avgProtein: daysWithMeals ? Math.round(meals.reduce((a, m) => a + m.protein, 0) / daysWithMeals) : 0,
        trained,
        km: Math.round(km * 10) / 10,
        adherence: weekAdherence(s.checkIns, start),
      })
    }
    return out
  }, [s, today])

  // Progresión de cargas: mejor peso por ejercicio (primera vs última sesión)
  const lifts = useMemo(() => {
    const byEx: Record<string, { name: string; first: number; last: number }> = {}
    const sessions = Object.values(s.sessions).sort((a, b) => a.date.localeCompare(b.date))
    for (const sess of sessions) {
      const day = s.plan.find((d) => d.key === sess.dayKey)
      for (const [exId, log] of Object.entries(sess.logs)) {
        const weights = log.sets.map((st) => (st.weight === '' ? 0 : Number(st.weight))).filter(Boolean)
        if (weights.length === 0) continue
        const max = Math.max(...weights)
        const name = day?.exercises.find((e) => e.id === exId)?.name ?? exId
        if (!byEx[exId]) byEx[exId] = { name, first: max, last: max }
        else byEx[exId].last = max
      }
    }
    return Object.values(byEx)
  }, [s.sessions, s.plan])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Progreso</h1>

      <div className="grid grid-cols-3 gap-3">
        <Card><Stat label="Peso" value={`${weight.toFixed(1)}`} sub="kg actual" /></Card>
        <Card><Stat label="Racha" value={<span className="text-acid">{streak}</span>} sub="días" /></Card>
        <Card><Stat label="Faltan" value={`${Math.max(0, weight - s.profile.goalWeight).toFixed(1)}`} sub="kg para 78" /></Card>
      </div>

      {/* Lectura del coach */}
      <Card className="border-acid/30">
        <CardTitle>Lectura del coach — últimos 7 días</CardTitle>
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 mb-1">✓ Qué va bien</div>
            {report.bien.map((t, i) => <p key={i} className="text-zinc-300 mb-0.5">· {t}</p>)}
          </div>
          {report.mal.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-1">▲ Qué está fallando</div>
              {report.mal.map((t, i) => <p key={i} className="text-zinc-300 mb-0.5">· {t}</p>)}
            </div>
          )}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-acid mb-1">→ Qué ajustar esta semana</div>
            {report.ajustar.map((t, i) => <p key={i} className="text-zinc-300 mb-0.5">· {t}</p>)}
          </div>
        </div>
      </Card>

      {/* Gráfica de peso */}
      <Card>
        <CardTitle>Peso corporal <span className="normal-case text-zinc-500">(línea gris = promedio 7 días)</span></CardTitle>
        {weightData.length < 2 ? (
          <div className="text-sm text-mut py-6 text-center">
            Registra tu peso en el check-in diario.<br />Con 2+ registros verás la curva aquí.
          </div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#26262b" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={AXIS_TICK} />
                <YAxis domain={[s.profile.goalWeight - 2, s.profile.startWeight + 1]} tick={AXIS_TICK} />
                <Tooltip contentStyle={TT_STYLE} />
                <ReferenceLine y={s.profile.goalWeight} stroke="#b4f629" strokeDasharray="6 4" label={{ value: `Meta ${s.profile.goalWeight}`, fill: '#b4f629', fontSize: 11 }} />
                <Line type="monotone" dataKey="promedio" stroke="#8b8b93" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="peso" stroke="#b4f629" strokeWidth={2.5} dot={{ fill: '#b4f629', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Calorías y proteína vs objetivo */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Calorías vs objetivo (14 días)</CardTitle>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySeries} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                <XAxis dataKey="date" tick={AXIS_TICK} interval={1} />
                <YAxis tick={AXIS_TICK} />
                <Tooltip contentStyle={TT_STYLE} cursor={{ fill: '#26262b55' }} />
                <ReferenceLine y={targets.kcal} stroke="#b4f629" strokeDasharray="6 4" />
                <Bar dataKey="kcal" radius={[3, 3, 0, 0]}>
                  {dailySeries.map((d, i) => (
                    <Cell key={i} fill={d.kcal === 0 ? '#3f3f46' : d.kcal <= targets.kcal * 1.1 ? '#b4f629' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardTitle>Proteína diaria (14 días)</CardTitle>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySeries} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                <XAxis dataKey="date" tick={AXIS_TICK} interval={1} />
                <YAxis tick={AXIS_TICK} />
                <Tooltip contentStyle={TT_STYLE} cursor={{ fill: '#26262b55' }} />
                <ReferenceLine y={targets.protein} stroke="#b4f629" strokeDasharray="6 4" />
                <Bar dataKey="proteina" radius={[3, 3, 0, 0]}>
                  {dailySeries.map((d, i) => (
                    <Cell key={i} fill={d.proteina === 0 ? '#3f3f46' : d.proteina >= targets.protein * 0.85 ? '#b4f629' : '#fbbf24'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Pasos y sueño */}
      {dailySeries.some((d) => d.pasos > 0 || d.sueno > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardTitle>Pasos (14 días)</CardTitle>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySeries} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <XAxis dataKey="date" tick={AXIS_TICK} interval={1} />
                  <YAxis tick={AXIS_TICK} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Line type="monotone" dataKey="pasos" stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <CardTitle>Sueño (14 días)</CardTitle>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySeries} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <XAxis dataKey="date" tick={AXIS_TICK} interval={1} />
                  <YAxis domain={[0, 10]} tick={AXIS_TICK} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <ReferenceLine y={7} stroke="#b4f629" strokeDasharray="6 4" />
                  <Line type="monotone" dataKey="sueno" stroke="#a78bfa" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Resumen semanal */}
      <Card>
        <CardTitle>Últimas 4 semanas</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-mut uppercase tracking-wider">
                <th className="text-left py-2 font-medium">Semana</th>
                <th className="text-right font-medium">Peso prom.</th>
                <th className="text-right font-medium">Kcal prom.</th>
                <th className="text-right font-medium">Prot. prom.</th>
                <th className="text-right font-medium">Entrenos</th>
                <th className="text-right font-medium">Km</th>
                <th className="text-right font-medium">Adher.</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.label} className="border-t border-line/60">
                  <td className="py-2.5 font-medium">{w.label}</td>
                  <td className="text-right">{w.avgWeight}</td>
                  <td className="text-right">{w.avgKcal || '—'}</td>
                  <td className="text-right">{w.avgProtein ? `${w.avgProtein}g` : '—'}</td>
                  <td className="text-right">{w.trained}</td>
                  <td className="text-right">{w.km || '—'}</td>
                  <td className="text-right font-semibold" style={{ color: w.adherence >= 70 ? '#b4f629' : w.adherence >= 40 ? '#fbbf24' : '#8b8b93' }}>
                    {w.adherence}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Plan vs realizado */}
      <Card>
        <CardTitle>Plan vs realizado — últimos 7 días</CardTitle>
        <div className="space-y-1.5">
          {planVsReal.map((p) => (
            <div key={p.date} className="flex items-center gap-2 text-xs bg-card2 rounded-lg px-3 py-2">
              <span className="w-8 text-mut shrink-0">{DAY_NAMES[weekdayIndex(p.date)].slice(0, 3)}</span>
              <span className="flex-1 min-w-0 truncate text-zinc-300">{p.planned}</span>
              {p.done ? (
                <>
                  <span className="text-mut truncate max-w-32">{p.done.name}</span>
                  <Chip tone={p.match ? 'ok' : 'warn'}>
                    {SOURCE_META[p.done.source].icon} {p.match ? '✓' : 'otro'}
                  </Chip>
                </>
              ) : (
                <Chip tone={p.date === today ? 'default' : 'warn'}>{p.date === today ? 'pendiente' : '—'}</Chip>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Actividades recientes unificadas */}
      {activities.length > 0 && (
        <Card>
          <CardTitle>Actividades recientes</CardTitle>
          <div className="space-y-1.5">
            {activities.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs bg-card2 rounded-lg px-3 py-2">
                <span className="text-mut shrink-0">{a.date.slice(5)}</span>
                <span className="flex-1 min-w-0 truncate text-zinc-300">{a.name}</span>
                <span className="text-mut">
                  {a.durationMin} min{a.distanceKm ? ` · ${a.distanceKm} km` : ''}{a.avgHR ? ` · ${a.avgHR} ppm` : ''}
                </span>
                <Chip>{SOURCE_META[a.source].icon}</Chip>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Cargas */}
      <Card>
        <CardTitle>Progresión de cargas</CardTitle>
        {lifts.length === 0 ? (
          <div className="text-sm text-mut">Registra pesos en tus entrenos para ver la progresión.</div>
        ) : (
          <div className="space-y-2">
            {lifts.map((l) => {
              const diff = l.last - l.first
              return (
                <div key={l.name} className="flex items-center gap-2 text-sm bg-card2 rounded-lg px-3 py-2">
                  <span className="flex-1 min-w-0 truncate">{l.name}</span>
                  <span className="text-mut text-xs">{l.first} → {l.last} kg</span>
                  <Chip tone={diff > 0 ? 'ok' : diff < 0 ? 'warn' : 'default'}>
                    {diff > 0 ? `+${diff} kg ↗` : diff < 0 ? `${diff} kg ↘` : 'estable'}
                  </Chip>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Badges */}
      <Badges />

      {/* Medidas corporales */}
      <MeasurementsCard />
    </div>
  )
}

function Badges() {
  const s = useStore()
  const streak = calcStreak(s.checkIns)
  const totalCheckIns = Object.keys(s.checkIns).length
  const totalSessions = Object.values(s.sessions).filter((x) => x.done).length
  const totalKm = Object.values(s.sessions).reduce((a, x) => a + (x.cardio?.distance ?? 0), 0)
  const lost = s.profile.startWeight - currentWeight(s)

  const badges = [
    { icon: '🔥', name: 'Racha 3', desc: '3 días seguidos', got: streak >= 3 },
    { icon: '⚡', name: 'Racha 7', desc: 'Semana perfecta', got: streak >= 7 },
    { icon: '🏋️', name: '10 entrenos', desc: '10 sesiones hechas', got: totalSessions >= 10 },
    { icon: '🏃', name: '25 km', desc: '25 km corridos', got: totalKm >= 25 },
    { icon: '📉', name: '-2 kg', desc: 'Primeros 2 kg', got: lost >= 2 },
    { icon: '🎯', name: '-5 kg', desc: 'Mitad del camino', got: lost >= 5 },
    { icon: '👑', name: 'RESET 78', desc: 'Meta cumplida', got: lost >= 10 },
    { icon: '📝', name: 'Constante', desc: '30 check-ins', got: totalCheckIns >= 30 },
  ]

  return (
    <Card>
      <CardTitle>Badges</CardTitle>
      <div className="grid grid-cols-4 gap-2">
        {badges.map((b) => (
          <div
            key={b.name}
            className={`rounded-xl p-2.5 text-center border ${
              b.got ? 'bg-acid/10 border-acid/40' : 'bg-card2 border-line opacity-40'
            }`}
          >
            <div className="text-xl">{b.icon}</div>
            <div className="text-[11px] font-bold mt-0.5">{b.name}</div>
            <div className="text-[9px] text-mut">{b.desc}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function MeasurementsCard() {
  const s = useStore()
  const [form, setForm] = useState<Measurement>({ date: todayStr() })
  const fields: { key: keyof Omit<Measurement, 'date'>; label: string }[] = [
    { key: 'cintura', label: 'Cintura' },
    { key: 'pecho', label: 'Pecho' },
    { key: 'abdomen', label: 'Abdomen' },
    { key: 'cadera', label: 'Cadera' },
    { key: 'brazo', label: 'Brazo' },
    { key: 'pierna', label: 'Pierna' },
  ]
  const last = s.measurements[s.measurements.length - 1]

  return (
    <Card>
      <CardTitle>Medidas corporales (cm)</CardTitle>
      {last && (
        <div className="flex gap-2 flex-wrap mb-3">
          {fields.map((f) =>
            last[f.key] ? <Chip key={f.key}>{f.label}: {last[f.key]} cm</Chip> : null,
          )}
          <span className="text-[11px] text-mut self-center">últ. registro {last.date}</span>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {fields.map((f) => (
          <Input
            key={f.key}
            label={f.label}
            type="number"
            inputMode="decimal"
            step="0.5"
            value={form[f.key] ?? ''}
            onChange={(e) => setForm({ ...form, [f.key]: e.target.value === '' ? undefined : +e.target.value })}
          />
        ))}
      </div>
      <Button
        className="w-full"
        disabled={!fields.some((f) => form[f.key])}
        onClick={() => {
          s.addMeasurement({ ...form, date: todayStr() })
          setForm({ date: todayStr() })
        }}
      >
        Guardar medidas de hoy
      </Button>
    </Card>
  )
}
