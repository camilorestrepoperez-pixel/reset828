import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, workoutForDate, currentWeight, mealsForDate } from '../store/useStore'
import { todayStr, addDays, weekStart, weekdayIndex, DAY_NAMES, formatDate, weekAdherence, calcTargets } from '../lib/calc'
import { getDayInfo, monthGrid, STATUS_COLORS, STATUS_LABELS, MONTH_NAMES, type DayStatus } from '../lib/calendar'
import { buildMealSuggestion, DAY_TYPE_INFO } from '../lib/mealCoach'
import { unifiedActivities, SOURCE_META } from '../services/unifiedActivityService'
import { dailyMetrics } from '../services/healthDataMapper'
import { Card, CardTitle, Button, Chip, Modal, Select } from '../components/ui'

const TYPE_ICONS: Record<string, string> = {
  lun: '🏋️', mar: '🏃', mie: '🏋️', jue: '⚡', vie: '🏋️', sab: '🏃', dom: '🧘',
}

export default function Calendar() {
  const s = useStore()
  const today = todayStr()
  const [view, setView] = useState<'mes' | 'semana'>('mes')
  const [cursor, setCursor] = useState(today) // fecha de referencia
  const [detail, setDetail] = useState<string | null>(null)

  const year = +cursor.slice(0, 4)
  const month = +cursor.slice(5, 7) - 1

  const moveMonth = (n: number) => {
    const d = new Date(year, month + n, 1)
    setCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
  }

  const weeks = view === 'mes'
    ? monthGrid(year, month)
    : [Array.from({ length: 7 }, (_, i) => addDays(weekStart(cursor), i)) as (string | null)[]]

  const adherence = weekAdherence(s.checkIns, view === 'semana' ? cursor : today)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-black">Calendario</h1>
        <div className="flex gap-1 bg-card2 rounded-xl p-1">
          {(['mes', 'semana'] as const).map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); setCursor(today) }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                view === v ? 'bg-acid text-black' : 'text-mut'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {view === 'mes' ? (
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" className="!px-3 !py-1.5" onClick={() => moveMonth(-1)}>←</Button>
            <div className="font-bold">{MONTH_NAMES[month]} {year}</div>
            <Button variant="ghost" className="!px-3 !py-1.5" onClick={() => moveMonth(1)}>→</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" className="!px-3 !py-1.5" onClick={() => setCursor(addDays(cursor, -7))}>←</Button>
            <div className="font-bold text-sm">Semana del {weekStart(cursor).slice(8)}/{weekStart(cursor).slice(5, 7)}</div>
            <Button variant="ghost" className="!px-3 !py-1.5" onClick={() => setCursor(addDays(cursor, 7))}>→</Button>
          </div>
        )}

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-mut mb-1.5">
          {DAY_NAMES.map((d) => <div key={d}>{d.slice(0, 3)}</div>)}
        </div>

        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((date, di) => {
                if (!date) return <div key={di} />
                const info = getDayInfo(date, s.checkIns, s.sessions, s.meals)
                const day = workoutForDate(s, date)
                const isToday = date === today
                return (
                  <button
                    key={date}
                    onClick={() => setDetail(date)}
                    className={`relative rounded-xl border p-1 sm:p-2 min-h-16 sm:min-h-20 flex flex-col items-center gap-0.5 transition hover:border-acid/50 ${
                      isToday ? 'border-acid/70 bg-acid/5' : 'border-line bg-card2/60'
                    }`}
                  >
                    <span className={`text-xs font-bold ${isToday ? 'text-acid' : ''}`}>{+date.slice(8)}</span>
                    <span className="text-sm leading-none" title={day.title}>{TYPE_ICONS[day.key]}</span>
                    <span
                      className="w-2 h-2 rounded-full mt-auto"
                      style={{ background: STATUS_COLORS[info.status] }}
                      title={STATUS_LABELS[info.status]}
                    />
                    {info.weight && (
                      <span className="hidden sm:block text-[9px] text-mut leading-none">{info.weight}kg</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Leyenda */}
        <div className="flex gap-3 flex-wrap mt-4 pt-3 border-t border-line/60">
          {(Object.keys(STATUS_COLORS) as DayStatus[]).map((st) => (
            <span key={st} className="flex items-center gap-1.5 text-[11px] text-mut">
              <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[st] }} />
              {STATUS_LABELS[st]}
            </span>
          ))}
        </div>
        <div className="flex gap-3 flex-wrap mt-2 text-[11px] text-mut">
          <span>🏋️ Gimnasio</span><span>🏃 Running</span><span>⚡ Funcional</span><span>🧘 Descanso</span>
        </div>
      </Card>

      <Card>
        <CardTitle>Adherencia de la semana</CardTitle>
        <div className="flex items-center gap-4">
          <span className="text-3xl font-black" style={{ color: adherence >= 70 ? '#b4f629' : adherence >= 40 ? '#fbbf24' : '#ef4444' }}>
            {adherence}%
          </span>
          <span className="text-sm text-mut">
            {adherence >= 80 ? 'Semana sólida. Repite.' : adherence >= 50 ? 'Vas a medias. Cierra fuerte.' : 'La semana está floja. Hoy se corrige.'}
          </span>
        </div>
      </Card>

      <DayDetailModal date={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

function DayDetailModal({ date, onClose }: { date: string | null; onClose: () => void }) {
  const s = useStore()
  if (!date) return null
  const info = getDayInfo(date, s.checkIns, s.sessions, s.meals)
  const day = workoutForDate(s, date)
  const c = s.checkIns[date]
  const dayMeals = s.meals.filter((m) => m.date === date)
  const protein = Math.round(dayMeals.reduce((a, m) => a + m.protein, 0))
  const garminDay = s.garmin.daily[date]
  const isToday = date === todayStr()
  const overridden = !!s.dayOverrides[date]

  return (
    <Modal open onClose={onClose} title={formatDate(date)}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Chip tone={info.status === 'cumplido' ? 'ok' : info.status === 'parcial' ? 'warn' : 'default'}>
            {STATUS_LABELS[info.status]}
          </Chip>
          {info.trained && <Chip tone="acid">Entrenó</Chip>}
          {info.weight && <Chip>{info.weight} kg</Chip>}
        </div>

        {/* Entreno del día + mover */}
        <div className="bg-card2 rounded-xl p-3">
          <div className="text-xs text-mut uppercase tracking-wider mb-1">Entreno {overridden && '(movido)'}</div>
          <div className="font-bold">{TYPE_ICONS[day.key]} {day.title}</div>
          <div className="text-xs text-mut mb-2">{day.focus} · {day.exercises.length} ejercicios</div>
          {date >= todayStr() && (
            <Select
              value={day.key}
              onChange={(e) => s.setDayOverride(date, e.target.value === '__auto__' ? null : e.target.value)}
              label="Mover / cambiar rutina de este día"
            >
              <option value="__auto__">Según plan semanal</option>
              {s.plan.map((d) => (
                <option key={d.key} value={d.key}>{d.title}</option>
              ))}
            </Select>
          )}
        </div>

        {/* Sugerencia de comida según el entreno */}
        {date >= todayStr() && (() => {
          const sug = buildMealSuggestion({
            day, date, checkIn: s.checkIns[date], garminDaily: s.garmin.daily[date],
            session: s.sessions[date], targets: calcTargets(s.profile, currentWeight(s)),
            todayMeals: mealsForDate(s, date),
          })
          return (
            <div className="bg-card2 rounded-xl p-3">
              <div className="text-xs text-mut uppercase tracking-wider mb-1">
                {DAY_TYPE_INFO[sug.type].icon} Comida sugerida — {DAY_TYPE_INFO[sug.type].label.toLowerCase()}
              </div>
              <div className="text-xs text-zinc-300 space-y-0.5">
                <div><span className="text-mut">Desayuno:</span> {sug.meals.desayuno?.name}</div>
                {sug.preEntreno && <div><span className="text-mut">Pre-running:</span> {sug.preEntreno.name}</div>}
                <div><span className="text-mut">Almuerzo:</span> {sug.meals.almuerzo?.name}</div>
                <div><span className="text-mut">Cena:</span> {sug.meals.cena?.name}</div>
                {sug.postEntreno && <div><span className="text-mut">Post-entreno:</span> {sug.postEntreno.name}</div>}
              </div>
            </div>
          )
        })()}

        {/* Actividad real del día (todas las fuentes) */}
        {(() => {
          const acts = unifiedActivities({ garmin: s.garmin, strava: s.strava, apple: s.apple, sessions: s.sessions, plan: s.plan })
            .filter((a) => a.date === date)
          const m = dailyMetrics({ date, garmin: s.garmin, apple: s.apple, checkIn: s.checkIns[date] })
          if (acts.length === 0 && m.source === 'ninguna') return null
          return (
            <div className="bg-card2 rounded-xl p-3 space-y-1">
              <div className="text-xs text-mut uppercase tracking-wider mb-1">Actividad real</div>
              {acts.map((a) => (
                <div key={a.id} className="text-xs text-zinc-300">
                  {a.name} · {a.durationMin} min{a.distanceKm ? ` · ${a.distanceKm} km` : ''}{a.calories ? ` · ${a.calories} kcal` : ''} · {SOURCE_META[a.source].icon}
                </div>
              ))}
              {m.steps !== undefined && (
                <div className="text-xs text-mut">
                  {m.steps.toLocaleString('es-CO')} pasos · fuente: {m.source}{m.overrides.length > 0 ? ` (override: ${m.overrides.join(', ')})` : ''}
                </div>
              )}
            </div>
          )
        })()}

        {/* Resumen del día */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-card2 rounded-xl p-3">
            <div className="text-xs text-mut">Comida</div>
            <div className="font-bold">{info.kcal > 0 ? `${info.kcal} kcal · ${protein}g prot` : 'Sin registro'}</div>
          </div>
          <div className="bg-card2 rounded-xl p-3">
            <div className="text-xs text-mut">Check-in</div>
            <div className="font-bold">
              {c ? `Energía ${c.energy ?? '—'} · Sueño ${c.sleep ?? '—'}h` : 'Sin hacer'}
            </div>
          </div>
          {garminDay && (
            <>
              <div className="bg-card2 rounded-xl p-3">
                <div className="text-xs text-mut">Pasos (Garmin)</div>
                <div className="font-bold">{garminDay.steps.toLocaleString('es-CO')}</div>
              </div>
              <div className="bg-card2 rounded-xl p-3">
                <div className="text-xs text-mut">Body Battery</div>
                <div className="font-bold">{garminDay.bodyBattery}/100</div>
              </div>
            </>
          )}
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-3 gap-2">
          <Link to={isToday ? '/entreno' : `/entreno?d=${date}`} onClick={onClose}>
            <Button variant="ghost" className="w-full !text-xs">🏋️ Entreno</Button>
          </Link>
          <Link to={`/nutricion?d=${date}`} onClick={onClose}>
            <Button variant="ghost" className="w-full !text-xs">🍽️ Comida</Button>
          </Link>
          <Link to="/checkin" onClick={onClose}>
            <Button variant={isToday && !c ? 'primary' : 'ghost'} className="w-full !text-xs">✓ Check-in</Button>
          </Link>
        </div>
      </div>
    </Modal>
  )
}
