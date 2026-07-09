import { useState } from 'react'
import { useStore, currentWeight } from '../store/useStore'
import { calcTargets } from '../lib/calc'
import { bmi, bmiClass, lossPlan, deficitAlerts, goalRecommendations } from '../lib/body'
import { Card, CardTitle, Input, Select, Button, Scale } from '../components/ui'
import type { Profile as ProfileType } from '../types'

export default function Profile() {
  const s = useStore()
  const [p, setP] = useState<ProfileType>(s.profile)
  const [saved, setSaved] = useState(false)
  const weight = currentWeight(s)
  const targets = calcTargets(p, weight)

  const set = <K extends keyof ProfileType>(k: K, v: ProfileType[K]) => {
    setP((prev) => ({ ...prev, [k]: v }))
    setSaved(false)
  }

  const save = () => {
    s.updateProfile(p)
    setSaved(true)
  }

  const togglePref = (pref: string) => {
    set(
      'trainingPrefs',
      p.trainingPrefs.includes(pref) ? p.trainingPrefs.filter((x) => x !== pref) : [...p.trainingPrefs, pref],
    )
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-black">Perfil físico</h1>

      <Card>
        <CardTitle>Datos base</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nombre" value={p.name} onChange={(e) => set('name', e.target.value)} />
          <Input label="Edad" type="number" value={p.age} onChange={(e) => set('age', +e.target.value)} />
          <Select label="Sexo" value={p.sex} onChange={(e) => set('sex', e.target.value as 'M' | 'F')}>
            <option value="M">Hombre</option>
            <option value="F">Mujer</option>
          </Select>
          <Input label="Altura (cm)" type="number" value={p.height} onChange={(e) => set('height', +e.target.value)} />
          <Input label="Peso inicial (kg)" type="number" step="0.1" value={p.startWeight} onChange={(e) => set('startWeight', +e.target.value)} />
          <Input label="Peso meta (kg)" type="number" step="0.1" value={p.goalWeight} onChange={(e) => set('goalWeight', +e.target.value)} />
        </div>
      </Card>

      <Card>
        <CardTitle>Actividad y entrenamiento</CardTitle>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Select label="Nivel de actividad" value={p.activityLevel} onChange={(e) => set('activityLevel', e.target.value as ProfileType['activityLevel'])}>
            <option value="sedentario">Sedentario (oficina, poco movimiento)</option>
            <option value="ligero">Ligero (1-2 entrenos/semana)</option>
            <option value="moderado">Moderado (3-5 entrenos/semana)</option>
            <option value="alto">Alto (6-7 entrenos/semana)</option>
          </Select>
          <Input label="Días disponibles para entrenar" type="number" min={1} max={7} value={p.trainingDays} onChange={(e) => set('trainingDays', +e.target.value)} />
          <Select label="Experiencia en gimnasio" value={p.experience} onChange={(e) => set('experience', e.target.value as ProfileType['experience'])}>
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </Select>
          <Input label="Horas de sueño promedio" type="number" step="0.5" value={p.sleepHours} onChange={(e) => set('sleepHours', +e.target.value)} />
        </div>
        <div className="mb-3">
          <span className="text-xs text-mut block mb-1.5">Tipo de entrenamiento preferido</span>
          <div className="flex gap-2">
            {['gimnasio', 'running', 'funcional'].map((pref) => (
              <button
                key={pref}
                onClick={() => togglePref(pref)}
                className={`px-3 py-2 rounded-xl text-sm font-medium border capitalize transition ${
                  p.trainingPrefs.includes(pref) ? 'bg-acid/10 border-acid/50 text-acid' : 'bg-card2 border-line text-mut'
                }`}
              >
                {pref}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Scale label="Nivel de estrés habitual" value={p.stressLevel} onChange={(v) => set('stressLevel', v)} />
          <Input label="Lesiones o molestias" placeholder="Ej: rodilla derecha, hombro..." value={p.injuries} onChange={(e) => set('injuries', e.target.value)} />
        </div>
      </Card>

      <Card>
        <CardTitle>Alimentación</CardTitle>
        <div className="space-y-3">
          <Input label="Preferencias alimenticias" value={p.foodPrefs} onChange={(e) => set('foodPrefs', e.target.value)} />
          <Input label="Alimentos que NO puede comer (alergias)" value={p.foodAllergies} onChange={(e) => set('foodAllergies', e.target.value)} />
          <Input label="Alimentos que no le gustan" value={p.foodDislikes} onChange={(e) => set('foodDislikes', e.target.value)} />
          <Input label="Meta de agua (vasos/día)" type="number" value={p.waterGoal} onChange={(e) => set('waterGoal', +e.target.value)} />
        </div>
      </Card>

      {/* Estado físico: IMC, meta y ritmo */}
      <Card>
        <CardTitle>Estado físico</CardTitle>
        {(() => {
          const imc = bmi(weight, p.height)
          const cls = bmiClass(imc)
          const goalImc = bmi(p.goalWeight, p.height)
          const plan = lossPlan(weight, p.goalWeight)
          const alerts = deficitAlerts(p, weight, targets)
          return (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-3">
                <div className="bg-card2 rounded-xl p-3">
                  <div className="text-xl font-black" style={{ color: cls.color }}>{imc}</div>
                  <div className="text-[11px] text-mut">IMC · {cls.label}</div>
                </div>
                <div className="bg-card2 rounded-xl p-3">
                  <div className="text-xl font-black">{weight.toFixed(1)} → {p.goalWeight}</div>
                  <div className="text-[11px] text-mut">kg actual → meta (IMC {goalImc})</div>
                </div>
                <div className="bg-card2 rounded-xl p-3">
                  <div className="text-xl font-black text-acid">-{plan.toLose}</div>
                  <div className="text-[11px] text-mut">kg por bajar</div>
                </div>
                <div className="bg-card2 rounded-xl p-3">
                  <div className="text-xl font-black">{plan.weeks} sem</div>
                  <div className="text-[11px] text-mut">a {plan.rateRange} · ~{plan.etaLabel}</div>
                </div>
              </div>
              {alerts.map((a, i) => (
                <p key={i} className="text-xs text-amber-300 bg-amber-500/10 rounded-lg px-3 py-2 mb-1.5">▲ {a}</p>
              ))}
              <div className="text-xs text-mut uppercase tracking-wider mt-3 mb-1.5">Recomendaciones para tu objetivo</div>
              <ul className="text-xs text-zinc-300 space-y-1">
                {goalRecommendations(p, targets).map((r, i) => <li key={i}>· {r}</li>)}
              </ul>
            </>
          )
        })()}
      </Card>

      {/* Cálculo en vivo */}
      <Card className="border-acid/30">
        <CardTitle>Tu plan calórico (calculado)</CardTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-card2 rounded-xl p-3">
            <div className="text-xl font-black">{targets.maintenance}</div>
            <div className="text-[11px] text-mut">Mantenimiento kcal</div>
          </div>
          <div className="bg-card2 rounded-xl p-3">
            <div className="text-xl font-black text-red-400">-{targets.deficit}</div>
            <div className="text-[11px] text-mut">Déficit (20%)</div>
          </div>
          <div className="bg-acid/10 border border-acid/30 rounded-xl p-3">
            <div className="text-xl font-black text-acid">{targets.kcal}</div>
            <div className="text-[11px] text-mut">Objetivo diario</div>
          </div>
          <div className="bg-card2 rounded-xl p-3">
            <div className="text-xl font-black">{targets.protein}g</div>
            <div className="text-[11px] text-mut">Proteína</div>
          </div>
        </div>
        <div className="text-xs text-mut mt-3">
          Macros: <b className="text-zinc-300">{targets.protein}g proteína · {targets.carbs}g carbos · {targets.fat}g grasas</b>.
          Déficit moderado (Mifflin-St Jeor × actividad − 20%). Ritmo esperado: 0.5–0.8 kg/semana. Sostenible, no agresivo.
        </div>
      </Card>

      <div className="flex gap-3 items-center">
        <Button onClick={save}>Guardar perfil</Button>
        {saved && <span className="text-sm text-emerald-400">✓ Guardado</span>}
      </div>

      <BackupCard />
    </div>
  )
}

// Copia de seguridad: exporta/importa TODO el estado (peso, comidas, entrenos, check-ins)
function BackupCard() {
  const [msg, setMsg] = useState('')

  const exportJson = () => {
    const data = localStorage.getItem('reset78-store')
    if (!data) return setMsg('No hay datos para exportar todavía.')
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reset78-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg('✓ Backup descargado.')
  }

  const importJson = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result)
        const parsed = JSON.parse(text)
        if (!parsed?.state?.profile) throw new Error('estructura inválida')
        if (!window.confirm('Esto reemplaza TODOS los datos actuales con los del backup. ¿Continuar?')) return
        localStorage.setItem('reset78-store', text)
        window.location.reload()
      } catch {
        setMsg('El archivo no es un backup válido de RESET 78.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <Card>
      <CardTitle>Copia de seguridad</CardTitle>
      <p className="text-xs text-mut mb-3">
        Tus datos viven en este navegador. Exporta un backup de vez en cuando, o úsalo para pasar todo a otro dispositivo.
      </p>
      <div className="flex gap-2 flex-wrap items-center">
        <Button variant="ghost" onClick={exportJson}>⬇ Exportar datos (JSON)</Button>
        <label className="rounded-xl px-4 py-2.5 text-sm font-semibold bg-card2 text-zinc-200 border border-line hover:border-zinc-500 cursor-pointer transition">
          ⬆ Importar backup
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
          />
        </label>
        {msg && <span className="text-xs text-zinc-300">{msg}</span>}
      </div>
    </Card>
  )
}
