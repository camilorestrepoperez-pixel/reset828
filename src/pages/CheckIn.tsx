import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, currentWeight } from '../store/useStore'
import { todayStr, formatDate, calcTargets, dailyInsights } from '../lib/calc'
import { Card, CardTitle, Input, Button, Scale, Toggle } from '../components/ui'
import type { CheckIn as CheckInType } from '../types'

export default function CheckIn() {
  const s = useStore()
  const nav = useNavigate()
  const today = todayStr()
  const existing = s.checkIns[today]
  const [c, setC] = useState<CheckInType>(
    existing ?? {
      date: today,
      trainingDone: false,
      nutritionDone: false,
      waterDone: (s.water[today] ?? 0) >= s.profile.waterGoal,
    },
  )
  const [savedInsights, setSavedInsights] = useState<ReturnType<typeof dailyInsights> | null>(null)

  const set = <K extends keyof CheckInType>(k: K, v: CheckInType[K]) => setC((prev) => ({ ...prev, [k]: v }))

  const save = () => {
    s.saveCheckIn(c)
    const weight = c.weight ?? currentWeight(s)
    const targets = calcTargets(s.profile, weight)
    setSavedInsights(
      dailyInsights({ checkIns: { ...s.checkIns, [today]: c }, meals: s.meals, targets, date: today }),
    )
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h1 className="text-2xl font-black">Check-in diario</h1>
        <div className="text-xs text-mut capitalize">{formatDate(today)} · 2 minutos, sin excusas</div>
      </div>

      <Card>
        <CardTitle>Cuerpo</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Peso de la mañana (kg)" type="number" inputMode="decimal" step="0.1" placeholder="En ayunas" value={c.weight ?? ''} onChange={(e) => set('weight', e.target.value === '' ? undefined : +e.target.value)} />
          <Input label="Horas de sueño" type="number" inputMode="decimal" step="0.5" value={c.sleep ?? ''} onChange={(e) => set('sleep', e.target.value === '' ? undefined : +e.target.value)} />
        </div>
      </Card>

      <Card>
        <CardTitle>Estado</CardTitle>
        <div className="space-y-4">
          <Scale label="Energía" value={c.energy} onChange={(v) => set('energy', v)} />
          <Scale label="Hambre" value={c.hunger} onChange={(v) => set('hunger', v)} />
          <Scale label="Estrés" value={c.stress} onChange={(v) => set('stress', v)} />
        </div>
      </Card>

      <Card>
        <CardTitle>Cumplimiento de hoy</CardTitle>
        <div className="space-y-2">
          <Toggle label="🏋️ Entrenamiento cumplido" value={c.trainingDone} onChange={(v) => set('trainingDone', v)} />
          <Toggle label="🍽️ Alimentación cumplida" value={c.nutritionDone} onChange={(v) => set('nutritionDone', v)} />
          <Toggle label="💧 Agua cumplida" value={c.waterDone} onChange={(v) => set('waterDone', v)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Input label="Pasos del día" type="number" inputMode="numeric" placeholder="Ej: 8500" value={c.steps ?? ''} onChange={(e) => set('steps', e.target.value === '' ? undefined : +e.target.value)} />
          <Input label="Calorías quemadas" type="number" inputMode="numeric" placeholder="del reloj o estimadas" value={c.caloriesBurned ?? ''} onChange={(e) => set('caloriesBurned', e.target.value === '' ? undefined : +e.target.value)} />
        </div>
        {(s.garmin.daily[today] || s.apple.daily[today]) && (
          <p className="text-[11px] text-mut mt-2">
            📡 Sincronizado: {s.garmin.daily[today]
              ? `${s.garmin.daily[today].steps.toLocaleString('es-CO')} pasos · ${s.garmin.daily[today].activeCalories} kcal (Garmin)`
              : `${s.apple.daily[today]!.steps.toLocaleString('es-CO')} pasos · ${s.apple.daily[today]!.activeCalories} kcal (Apple Health)`}.
            Deja los campos vacíos para usar eso — si escribes, tu dato manda (override manual).
          </p>
        )}
      </Card>

      <Card>
        <CardTitle>Nota personal</CardTitle>
        <textarea
          value={c.note ?? ''}
          onChange={(e) => set('note', e.target.value)}
          placeholder="¿Cómo te fue? ¿Qué se interpuso? ¿Qué salió bien?"
          rows={3}
          className="w-full bg-card2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-acid/60 placeholder:text-zinc-600 resize-none"
        />
      </Card>

      <Button className="w-full !py-3.5" onClick={save}>
        {existing ? 'Actualizar check-in' : 'Guardar check-in'}
      </Button>

      {savedInsights && (
        <Card className="border-acid/40">
          <CardTitle>El coach dice</CardTitle>
          <div className="space-y-2 mb-4">
            {savedInsights.map((ins, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className={ins.level === 'ok' ? 'text-emerald-400' : ins.level === 'warn' ? 'text-amber-400' : 'text-acid'}>
                  {ins.level === 'ok' ? '●' : '▲'}
                </span>
                <span className="text-zinc-300">{ins.text}</span>
              </div>
            ))}
          </div>
          <Button variant="ghost" className="w-full" onClick={() => nav('/')}>Volver al dashboard</Button>
        </Card>
      )}
    </div>
  )
}
