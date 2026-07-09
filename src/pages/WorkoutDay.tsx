import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStore, workoutForDate, currentWeight, macrosForDate, mealsForDate } from '../store/useStore'
import { todayStr, weekdayIndex, formatDate, suggestProgression, DAY_NAMES, calcTargets } from '../lib/calc'
import { suggestLightDay } from '../services/garmin/garminHealthMapper'
import { sendWorkoutToGarmin } from '../services/garmin/garminTrainingService'
import { isSupported as bleSupported, connectHR, hrZone } from '../services/bluetoothHR'
import { buildMealSuggestion, DAY_TYPE_INFO } from '../lib/mealCoach'
import { Card, Button, Chip, Modal, Input, Select, ProgressBar, Scale } from '../components/ui'
import type { Exercise, ExerciseLog, SetLog, SessionMode, BlockType } from '../types'

const BLOCK_LABELS: Record<BlockType, string> = {
  calentamiento: 'Calentamiento',
  principal: 'Trabajo principal',
  accesorio: 'Accesorios',
  cardio: 'Cardio',
  core: 'Core',
  movilidad: 'Movilidad',
}
const BLOCK_ORDER: BlockType[] = ['calentamiento', 'principal', 'accesorio', 'core', 'cardio', 'movilidad']

const MODE_INFO: Record<SessionMode, { label: string; note: string }> = {
  normal: { label: 'Normal', note: '' },
  rapida: { label: '⚡ Rápida', note: 'Versión de ~25 min: los 4 ejercicios clave, 2 series cada uno. Poco tiempo no es excusa para cero.' },
  ligera: { label: '🪶 Ligera', note: 'Día ligero: baja las cargas ~40% y quédate en RPE 6 máximo. Hoy el objetivo es moverse, no progresar.' },
}

export default function WorkoutDay() {
  const s = useStore()
  const [params, setParams] = useSearchParams()
  const date = params.get('d') ?? todayStr()
  const day = workoutForDate(s, date)
  const session = s.sessions[date]
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editEx, setEditEx] = useState<Exercise | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [dupTarget, setDupTarget] = useState('')
  const [garminMsg, setGarminMsg] = useState('')

  const sendToGarmin = async () => {
    setGarminMsg('Enviando...')
    const res = await sendWorkoutToGarmin(day, date, s.garmin.demo)
    if (res.ok) s.markGarminSent(date)
    setGarminMsg(res.ok ? `✓ ${res.message}` : res.message)
  }

  // Modo de la sesión (normal / rápida / ligera)
  const mode: SessionMode = session?.mode ?? 'normal'
  const strengthFirst = [...day.exercises].sort((a, b) =>
    (a.type === 'fuerza' || a.type === 'funcional' ? 0 : 1) - (b.type === 'fuerza' || b.type === 'funcional' ? 0 : 1),
  )
  const visibleExercises = mode === 'rapida' ? strengthFirst.slice(0, 4) : day.exercises

  // Sugerencia de día ligero: check-in (sueño/energía) o Garmin (body battery)
  const checkIn = s.checkIns[date]
  const fatigued =
    mode === 'normal' &&
    ((checkIn?.sleep !== undefined && checkIn.sleep > 0 && checkIn.sleep < 6) ||
      (checkIn?.energy !== undefined && checkIn.energy <= 4) ||
      suggestLightDay(s.garmin.daily[date]))

  const doneCount = visibleExercises.filter((e) => session?.logs[e.id]?.completed).length
  const isCardioDay = day.exercises.some((e) => e.type === 'cardio')

  // Tiempo total estimado y agrupación por bloques
  const totalMin = visibleExercises.reduce((a, e) => a + (e.estMin ?? 8), 0)
  const blocks = BLOCK_ORDER
    .map((b) => ({
      block: b,
      exercises: visibleExercises.filter((e) => (e.block ?? 'principal') === b),
    }))
    .filter((g) => g.exercises.length > 0)

  // Sugerencia de comida cruzada con el entreno de hoy
  const targets = calcTargets(s.profile, currentWeight(s))
  const mealSug = buildMealSuggestion({
    day, date, checkIn: s.checkIns[date], garminDaily: s.garmin.daily[date],
    session, targets, todayMeals: mealsForDate(s, date),
  })

  const getLog = (ex: Exercise): ExerciseLog =>
    session?.logs[ex.id] ?? {
      completed: false,
      sets: Array.from({ length: ex.sets }, () => ({ reps: '', weight: '' }) as SetLog),
    }

  const toggleComplete = (ex: Exercise) => {
    const log = getLog(ex)
    s.saveExerciseLog(date, day.key, ex.id, { ...log, completed: !log.completed })
  }

  const updateSet = (ex: Exercise, i: number, field: keyof SetLog, value: string) => {
    const log = getLog(ex)
    const sets = log.sets.map((st, j) => (j === i ? { ...st, [field]: value === '' ? '' : +value } : st))
    s.saveExerciseLog(date, day.key, ex.id, { ...log, sets })
  }

  // Historial para progresión y "última vez"
  const historyFor = (exId: string) =>
    Object.values(s.sessions)
      .filter((sess) => sess.date < date && sess.logs[exId]?.completed)
      .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-mut capitalize">{formatDate(date)}</div>
          <h1 className="text-2xl font-black mt-0.5">{day.title}</h1>
          <div className="text-sm text-mut">{day.focus}</div>
        </div>
        <Select
          value={date}
          onChange={(e) => setParams(e.target.value === todayStr() ? {} : { d: e.target.value })}
          className="!w-auto"
        >
          {Array.from({ length: 7 }, (_, i) => {
            const monday = new Date(todayStr() + 'T12:00:00')
            monday.setDate(monday.getDate() - weekdayIndex(todayStr()) + i)
            const d = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
            return (
              <option key={d} value={d}>
                {DAY_NAMES[i]} {d === todayStr() ? '(hoy)' : ''}
              </option>
            )
          })}
        </Select>
      </div>

      {/* Sugerencia de día ligero */}
      {fatigued && (
        <Card className="border-amber-500/40">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-amber-300">
              🪶 Vienes con poca gasolina (sueño/energía/Body Battery bajos). Hoy conviene la versión ligera.
            </p>
            <Button variant="ghost" className="!py-1.5 !text-xs shrink-0" onClick={() => s.setSessionMode(date, day.key, 'ligera')}>
              Activar ligera
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-mut shrink-0">Modo:</span>
          <div className="flex gap-1 bg-card2 rounded-xl p-1 flex-1">
            {(Object.keys(MODE_INFO) as SessionMode[]).map((m) => (
              <button
                key={m}
                onClick={() => s.setSessionMode(date, day.key, m)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition ${
                  mode === m ? 'bg-acid text-black' : 'text-mut'
                }`}
              >
                {MODE_INFO[m].label}
              </button>
            ))}
          </div>
        </div>
        {mode !== 'normal' && (
          <p className="text-xs text-zinc-300 bg-card2 rounded-lg px-3 py-2 mb-3">{MODE_INFO[mode].note}</p>
        )}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar value={doneCount} max={visibleExercises.length} h="h-2.5" />
            <div className="text-xs text-mut mt-1">{doneCount}/{visibleExercises.length} completados · ~{totalMin} min total</div>
          </div>
          {s.garmin.connected && (
            <Button variant="ghost" className="!text-xs" onClick={sendToGarmin}>
              {s.garminSent[date] ? '✓ Garmin' : '📤 Garmin'}
            </Button>
          )}
          <Button
            variant={session?.done ? 'ghost' : 'primary'}
            onClick={() => s.markSessionDone(date, day.key, !session?.done)}
          >
            {session?.done ? '✓ Sesión hecha' : 'Terminar sesión'}
          </Button>
        </div>
        {garminMsg && <p className="text-xs text-mut mt-2">{garminMsg}</p>}
      </Card>

      {/* Ejercicios agrupados por bloque */}
      <div className="space-y-3">
        {blocks.map(({ block, exercises }) => (
          <div key={block} className="space-y-3">
            <div className="flex items-center justify-between px-1 pt-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-mut">{BLOCK_LABELS[block]}</span>
              <span className="text-[11px] text-mut">~{exercises.reduce((a, e) => a + (e.estMin ?? 8), 0)} min</span>
            </div>
            {exercises.map((ex) => {
          const log = getLog(ex)
          const hist = historyFor(ex.id)
          const lastWeights = hist.length
            ? hist[hist.length - 1].logs[ex.id].sets.filter((st) => st.weight !== '').map((st) => st.weight)
            : []
          const prog = suggestProgression(hist.map((h) => ({ log: h.logs[ex.id] })))
          const open = expanded === ex.id
          const isStrength = ex.type === 'fuerza' || ex.type === 'funcional'

          return (
            <Card key={ex.id} className={log.completed ? 'border-acid/40' : ''}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleComplete(ex)}
                  aria-label={`Marcar ${ex.name}`}
                  className={`w-9 h-9 shrink-0 rounded-xl grid place-items-center text-lg font-bold border transition ${
                    log.completed ? 'bg-acid text-black border-acid' : 'bg-card2 border-line text-mut hover:border-acid/50'
                  }`}
                >
                  {log.completed ? '✓' : ''}
                </button>
                <button className="flex-1 text-left min-w-0" onClick={() => setExpanded(open ? null : ex.id)}>
                  <div className={`font-semibold text-sm ${log.completed ? 'line-through text-mut' : ''}`}>{ex.name}</div>
                  <div className="text-xs text-mut flex items-center gap-2 flex-wrap mt-0.5">
                    <span>{ex.muscle}</span>·<span>{ex.sets}×{ex.reps}</span>·<span>desc. {ex.rest}</span>
                    {lastWeights.length > 0 && (
                      <Chip tone="acid">últ: {lastWeights.join('/')}kg</Chip>
                    )}
                  </div>
                </button>
                <span className="text-mut text-xs">{open ? '▲' : '▼'}</span>
              </div>

              {open && (
                <div className="mt-4 pt-3 border-t border-line space-y-3">
                  <p className="text-xs text-zinc-400 bg-card2 rounded-lg px-3 py-2">💡 {ex.cue}</p>

                  {prog && hist.length > 0 && (
                    <p className={`text-xs px-3 py-2 rounded-lg ${
                      prog.action === 'subir' ? 'bg-acid/10 text-acid' : prog.action === 'bajar' ? 'bg-amber-500/10 text-amber-400' : 'bg-card2 text-zinc-400'
                    }`}>
                      📈 {prog.message}
                    </p>
                  )}

                  {/* Historial: últimas 3 sesiones */}
                  {hist.length > 0 && (
                    <div className="text-xs space-y-1">
                      <div className="text-mut uppercase tracking-wider text-[10px]">Historial</div>
                      {hist.slice(-3).reverse().map((h) => {
                        const l = h.logs[ex.id]
                        const setsTxt = l.sets
                          .filter((st) => st.weight !== '' || st.reps !== '')
                          .map((st) => `${st.weight || '—'}kg×${st.reps || '—'}`)
                          .join(' · ')
                        return (
                          <div key={h.date} className="flex justify-between gap-2 bg-card2 rounded-lg px-3 py-1.5">
                            <span className="text-mut">{h.date.slice(5)}</span>
                            <span className="text-zinc-300 truncate">{setsTxt || l.notes || 'completado'}</span>
                            {l.rpe && <span className="text-mut shrink-0">RPE {l.rpe}</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {isStrength && (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 text-[11px] text-mut px-1">
                        <span>#</span><span>Peso (kg)</span><span>Reps</span>
                      </div>
                      {log.sets.map((st, i) => (
                        <div key={i} className="grid grid-cols-[2rem_1fr_1fr] gap-2 items-center">
                          <span className="text-xs text-mut text-center">{i + 1}</span>
                          <Input type="number" inputMode="decimal" placeholder="kg" value={st.weight} onChange={(e) => updateSet(ex, i, 'weight', e.target.value)} />
                          <Input type="number" inputMode="numeric" placeholder={ex.reps} value={st.reps} onChange={(e) => updateSet(ex, i, 'reps', e.target.value)} />
                        </div>
                      ))}
                    </div>
                  )}

                  {!isStrength && (
                    <Input
                      label="Registro (tiempo, distancia, sensación)"
                      placeholder="Ej: 5.2 km en 32 min, me sentí 7/10"
                      value={log.notes ?? ''}
                      onChange={(e) => s.saveExerciseLog(date, day.key, ex.id, { ...log, notes: e.target.value })}
                    />
                  )}

                  <Scale label="RPE — esfuerzo percibido" value={log.rpe} onChange={(v) => s.saveExerciseLog(date, day.key, ex.id, { ...log, rpe: v })} />

                  {isStrength && (
                    <Input
                      label="Notas"
                      placeholder="Sensaciones, técnica, molestias..."
                      value={log.notes ?? ''}
                      onChange={(e) => s.saveExerciseLog(date, day.key, ex.id, { ...log, notes: e.target.value })}
                    />
                  )}

                  <div className="flex gap-2">
                    <Button variant="ghost" className="!py-1.5 !text-xs" onClick={() => setEditEx(ex)}>Editar ejercicio</Button>
                    <Button variant="danger" className="!py-1.5 !text-xs" onClick={() => s.removeExercise(day.key, ex.id)}>Quitar</Button>
                  </div>
                </div>
              )}
            </Card>
          )
            })}
          </div>
        ))}
      </div>

      <Button variant="ghost" className="w-full" onClick={() => setShowAdd(true)}>+ Agregar ejercicio</Button>

      {/* Nutrición cruzada con el entreno de hoy */}
      <Card className="border-acid/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-mut">
            {DAY_TYPE_INFO[mealSug.type].icon} Comida para este entreno
          </span>
          <Link to={`/nutricion?d=${date}`} className="text-xs text-acid font-semibold">Registrar →</Link>
        </div>
        <p className="text-sm text-zinc-300 mb-2">{mealSug.note}</p>
        {mealSug.preEntreno && (
          <p className="text-xs text-zinc-300 bg-card2 rounded-lg px-3 py-2 mb-2">
            🏁 Pre-running (30-45 min antes): <b>{mealSug.preEntreno.name}</b> ({mealSug.preEntreno.kcal} kcal)
          </p>
        )}
        {mealSug.postEntreno && (
          <p className="text-xs text-zinc-300 bg-card2 rounded-lg px-3 py-2 mb-2">
            ⚡ Post-entreno: <b>{mealSug.postEntreno.name}</b> ({mealSug.postEntreno.kcal} kcal · {mealSug.postEntreno.protein}g prot)
          </p>
        )}
        {mealSug.alerts.map((a, i) => (
          <p key={i} className="text-xs text-amber-300 bg-amber-500/10 rounded-lg px-3 py-2 mb-1.5">▲ {a}</p>
        ))}
        <div className="text-xs text-mut">
          Cena sugerida: <span className="text-zinc-300">{mealSug.meals.cena?.name}</span>
        </div>
      </Card>

      {/* Duplicar rutina a otro día */}
      <Card>
        <div className="text-xs text-mut uppercase tracking-wider mb-2">Duplicar esta rutina</div>
        <div className="flex gap-2">
          <Select value={dupTarget} onChange={(e) => setDupTarget(e.target.value)} className="flex-1">
            <option value="">Elegir día destino...</option>
            {s.plan.filter((d) => d.key !== day.key).map((d) => (
              <option key={d.key} value={d.key}>{DAY_NAMES[d.dayIndex]} — {d.title}</option>
            ))}
          </Select>
          <Button
            variant="ghost"
            disabled={!dupTarget}
            onClick={() => {
              const target = s.plan.find((d) => d.key === dupTarget)
              if (target && window.confirm(`¿Reemplazar los ejercicios de "${target.title}" con los de "${day.title}"?`)) {
                s.duplicateRoutine(day.key, dupTarget)
                setDupTarget('')
              }
            }}
          >
            Duplicar
          </Button>
        </div>
        <p className="text-[11px] text-mut mt-2">Copia todos los ejercicios de hoy al día elegido (reemplaza los que tenga).</p>
      </Card>

      {/* FC en vivo desde el reloj (Web Bluetooth) */}
      <LiveHRCard age={s.profile.age} />

      {/* Registro de cardio del día */}
      {isCardioDay && <CardioCard date={date} dayKey={day.key} />}

      <ExerciseModal
        open={!!editEx || showAdd}
        initial={editEx}
        onClose={() => { setEditEx(null); setShowAdd(false) }}
        onSave={(data) => {
          if (editEx) s.updateExercise(day.key, editEx.id, data)
          else s.addExercise(day.key, data as Omit<Exercise, 'id'>)
          setEditEx(null)
          setShowAdd(false)
        }}
      />
    </div>
  )
}

// FC en vivo: el Garmin transmite como sensor Bluetooth estándar
// (en el reloj: Configuración → Sensores → Transmitir frecuencia cardiaca)
function LiveHRCard({ age }: { age: number }) {
  const [bpm, setBpm] = useState<number | null>(null)
  const [status, setStatus] = useState<'off' | 'connecting' | 'on'>('off')
  const [msg, setMsg] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const disconnectRef = useRef<(() => void) | undefined>(undefined)

  // desconectar al salir de la página
  useEffect(() => () => disconnectRef.current?.(), [])

  if (!bleSupported()) {
    return (
      <Card>
        <div className="text-sm font-semibold mb-1">❤️ FC en vivo</div>
        <p className="text-xs text-mut">
          Este navegador no soporta Web Bluetooth. Para ver tu frecuencia cardiaca en vivo desde el Garmin,
          abre la app en <b>Chrome (Android o PC)</b>. En iPhone/Safari no está disponible.
        </p>
      </Card>
    )
  }

  const connect = async () => {
    setStatus('connecting')
    setMsg('Activa en tu reloj: Configuración → Sensores → Transmitir frecuencia cardiaca. Luego selecciónalo en la lista.')
    const res = await connectHR(
      (v) => { setBpm(v); setStatus('on') },
      () => { setStatus('off'); setBpm(null); setMsg('Reloj desconectado.') },
    )
    if (res.ok) {
      disconnectRef.current = res.disconnect
      setDeviceName(res.deviceName ?? '')
      setMsg('')
    } else {
      setStatus('off')
      setMsg(res.message ?? '')
    }
  }

  const disconnect = () => {
    disconnectRef.current?.()
    setStatus('off')
    setBpm(null)
    setMsg('')
  }

  const zone = bpm ? hrZone(bpm, age) : null

  return (
    <Card className={status === 'on' ? 'border-acid/40' : ''}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">❤️ FC en vivo {deviceName && <span className="text-mut font-normal">· {deviceName}</span>}</div>
          {status === 'on' && bpm && zone ? (
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-4xl font-black tabular-nums" style={{ color: zone.color }}>{bpm}</span>
              <span className="text-sm text-mut">ppm</span>
              <Chip tone="default">
                <span style={{ color: zone.color }}>{zone.z} · {zone.label} ({Math.round(zone.pct * 100)}%)</span>
              </Chip>
            </div>
          ) : (
            <p className="text-xs text-mut mt-0.5">
              Conecta tu Garmin como sensor Bluetooth y ve tus pulsaciones y zona aquí mientras entrenas.
            </p>
          )}
        </div>
        {status === 'on' ? (
          <Button variant="ghost" className="!text-xs shrink-0" onClick={disconnect}>Desconectar</Button>
        ) : (
          <Button variant="ghost" className="!text-xs shrink-0" disabled={status === 'connecting'} onClick={connect}>
            {status === 'connecting' ? 'Buscando...' : '📡 Conectar reloj'}
          </Button>
        )}
      </div>
      {msg && <p className="text-xs text-zinc-400 bg-card2 rounded-lg px-3 py-2 mt-2">{msg}</p>}
    </Card>
  )
}

function CardioCard({ date, dayKey }: { date: string; dayKey: string }) {
  const s = useStore()
  const cardio = s.sessions[date]?.cardio ?? {}
  const upd = (patch: Partial<typeof cardio>) => s.saveCardio(date, dayKey, { ...cardio, ...patch })
  return (
    <Card>
      <div className="text-sm font-semibold mb-3">🏃 Registro de cardio</div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Input label="Distancia (km)" type="number" inputMode="decimal" step="0.1" value={cardio.distance ?? ''} onChange={(e) => upd({ distance: e.target.value === '' ? undefined : +e.target.value })} />
        <Input label="Tiempo (min)" type="number" inputMode="numeric" value={cardio.time ?? ''} onChange={(e) => upd({ time: e.target.value === '' ? undefined : +e.target.value })} />
        <Input label="Ritmo (min/km)" placeholder="6:10" value={cardio.pace ?? ''} onChange={(e) => upd({ pace: e.target.value })} />
      </div>
      <Scale label="Sensación (1 = fatal, 10 = volando)" value={cardio.feel} onChange={(v) => upd({ feel: v })} />
    </Card>
  )
}

function ExerciseModal({ open, initial, onClose, onSave }: {
  open: boolean
  initial: Exercise | null
  onClose: () => void
  onSave: (e: Partial<Exercise>) => void
}) {
  const blank: Omit<Exercise, 'id'> = { name: '', muscle: '', sets: 3, reps: '10', rest: '90s', cue: '', type: 'fuerza' }
  const [form, setForm] = useState<Omit<Exercise, 'id'>>(blank)
  // sincroniza al abrir
  useMemo(() => { setForm(initial ? { ...initial } : blank) }, [initial, open]) // eslint-disable-line

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar ejercicio' : 'Nuevo ejercicio'}>
      <div className="space-y-3">
        <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Grupo muscular" value={form.muscle} onChange={(e) => setForm({ ...form, muscle: e.target.value })} />
          <Select label="Tipo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Exercise['type'] })}>
            <option value="fuerza">Fuerza</option>
            <option value="cardio">Cardio</option>
            <option value="funcional">Funcional</option>
            <option value="movilidad">Movilidad</option>
          </Select>
          <Input label="Series" type="number" value={form.sets} onChange={(e) => setForm({ ...form, sets: +e.target.value })} />
          <Input label="Reps" value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} />
          <Input label="Descanso" value={form.rest} onChange={(e) => setForm({ ...form, rest: e.target.value })} />
        </div>
        <Input label="Técnica / instrucción" value={form.cue} onChange={(e) => setForm({ ...form, cue: e.target.value })} />
        <Button className="w-full" disabled={!form.name} onClick={() => onSave(form)}>Guardar</Button>
      </div>
    </Modal>
  )
}
