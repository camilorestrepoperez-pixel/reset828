import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore, currentWeight, macrosForDate, mealsForDate, allFoods, workoutForDate } from '../store/useStore'
import { todayStr, addDays, formatDate, calcTargets, weekStart } from '../lib/calc'
import { QUICK_MEALS } from '../data/quickMeals'
import { buildMealSuggestion, DAY_TYPE_INFO } from '../lib/mealCoach'
import { Card, CardTitle, Button, Input, Modal, ProgressBar, Chip } from '../components/ui'
import type { MealType, Food, FavMealItem, Recipe } from '../types'

const MEAL_LABELS: { key: MealType; label: string; icon: string }[] = [
  { key: 'desayuno', label: 'Desayuno', icon: '🌅' },
  { key: 'almuerzo', label: 'Almuerzo', icon: '☀️' },
  { key: 'cena', label: 'Cena', icon: '🌙' },
  { key: 'snack', label: 'Snacks / antojos', icon: '🥜' },
  { key: 'bebida', label: 'Bebidas / alcohol', icon: '🥤' },
]

export default function Nutrition() {
  const s = useStore()
  const [params] = useSearchParams()
  const [date, setDate] = useState(params.get('d') ?? todayStr())
  const [adding, setAdding] = useState<MealType | null>(null)
  const [toast, setToast] = useState('')

  // Mensaje de coach al registrar comida no ideal — cero juicio, puro control
  const onFoodAdded = (food?: Food) => {
    const nonIdeal = food && (food.note === 'ocasional' || food.note === 'alto en calorías' || food.category === 'Alcohol' || food.category === 'Comida fuera')
    if (!nonIdeal) return
    const msgs = [
      'Registrarlo ya es ganar control.',
      'No pasa nada. Ajustemos la cena.',
      'Esto no es ideal para déficit, pero cabe si el día se ordena.',
      'Compensa con proteína y una cena limpia.',
      'No lo borres mentalmente. Regístralo y seguimos.',
    ]
    setToast(msgs[Math.floor(Math.random() * msgs.length)])
    setTimeout(() => setToast(''), 3500)
  }
  const weight = currentWeight(s)
  const targets = calcTargets(s.profile, weight)
  const macros = macrosForDate(s, date)
  const dayMeals = mealsForDate(s, date)
  const remaining = Math.max(0, targets.kcal - macros.kcal)
  const proteinLeft = Math.max(0, targets.protein - macros.protein)

  const yesterdayHadMeals = mealsForDate(s, addDays(date, -1)).length > 0

  // Adherencia nutricional semanal: días con registro y kcal ≤ objetivo+10%
  const ws = weekStart(todayStr())
  const elapsed = Array.from({ length: 7 }, (_, i) => addDays(ws, i)).filter((d) => d <= todayStr())
  const okDays = elapsed.filter((d) => {
    const kcal = mealsForDate(s, d).reduce((a, m) => a + m.kcal, 0)
    return kcal > 0 && kcal <= targets.kcal * 1.1
  }).length
  const loggedDays = elapsed.filter((d) => mealsForDate(s, d).length > 0).length
  const nutriAdherence = Math.round((okDays / elapsed.length) * 100)

  // Guardar bloque como comida favorita
  const saveBlockAsFav = (meal: MealType) => {
    const items = dayMeals.filter((m) => m.meal === meal)
    if (items.length === 0) return
    const name = window.prompt('Nombre de la comida favorita:', items.map((i) => i.name.split(' ')[0]).join(' + '))
    if (!name) return
    s.saveFavMeal(name, meal, items.map(({ name: n, qty, kcal, protein, carbs, fat }) => ({ name: n, qty, kcal, protein, carbs, fat })))
  }

  // Repetir el mismo bloque de ayer
  const repeatBlock = (meal: MealType) => {
    mealsForDate(s, addDays(date, -1))
      .filter((m) => m.meal === meal)
      .forEach(({ name, qty, kcal, protein, carbs, fat }) =>
        s.addMeal({ date, meal, name, qty, kcal, protein, carbs, fat }),
      )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black">Nutrición</h1>
          <div className="text-xs text-mut capitalize">{formatDate(date)}</div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" className="!px-3" onClick={() => setDate(addDays(date, -1))}>←</Button>
          <Button variant="ghost" className="!px-3" onClick={() => setDate(todayStr())}>Hoy</Button>
          <Button variant="ghost" className="!px-3" disabled={date >= todayStr()} onClick={() => setDate(addDays(date, 1))}>→</Button>
        </div>
      </div>

      {/* Resumen macros */}
      <Card>
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="text-3xl font-black">{macros.kcal}</span>
            <span className="text-sm text-mut"> / {targets.kcal} kcal</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-acid">{remaining} kcal libres</div>
            <div className="text-[11px] text-mut">{proteinLeft}g de proteína pendiente</div>
          </div>
        </div>
        <ProgressBar value={macros.kcal} max={targets.kcal} h="h-2.5" />
        <div className="grid grid-cols-3 gap-3 mt-4">
          {([
            ['Proteína', macros.protein, targets.protein, '#b4f629'],
            ['Carbos', macros.carbs, targets.carbs, '#60a5fa'],
            ['Grasas', macros.fat, targets.fat, '#fbbf24'],
          ] as const).map(([label, v, t, c]) => (
            <div key={label}>
              <div className="flex justify-between text-[11px]">
                <span className="text-mut">{label}</span>
                <span className="font-semibold">{Math.round((v / t) * 100)}%</span>
              </div>
              <div className="text-sm font-bold mb-1">{v}<span className="text-mut font-normal">/{t}g</span></div>
              <ProgressBar value={v} max={t} color={c} h="h-1.5" />
            </div>
          ))}
        </div>
      </Card>

      {/* Sugerencias según el entreno del día */}
      <SuggestionCard date={date} />

      {/* Adherencia nutricional de la semana */}
      <Card>
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs text-mut uppercase tracking-wider">Semana</div>
            <div className="text-2xl font-black" style={{ color: nutriAdherence >= 70 ? '#b4f629' : nutriAdherence >= 40 ? '#fbbf24' : '#ef4444' }}>
              {nutriAdherence}%
            </div>
          </div>
          <div className="text-xs text-mut flex-1">
            {okDays} de {elapsed.length} días dentro del objetivo · {loggedDays} con registro.
            {nutriAdherence < 50 && loggedDays < elapsed.length && ' Sin registro no hay coach — anota aunque sea la cena.'}
          </div>
        </div>
      </Card>

      {yesterdayHadMeals && dayMeals.length === 0 && (
        <Button variant="ghost" className="w-full" onClick={() => s.repeatDay(addDays(date, -1), date)}>
          ⟳ Repetir las comidas de ayer
        </Button>
      )}

      {/* Comidas por bloque */}
      {MEAL_LABELS.map(({ key, label, icon }) => {
        const items = dayMeals.filter((m) => m.meal === key)
        const kcal = Math.round(items.reduce((a, m) => a + m.kcal, 0))
        return (
          <Card key={key}>
            <CardTitle
              right={
                <div className="flex items-center gap-2">
                  {kcal > 0 && <span className="text-xs text-mut">{kcal} kcal</span>}
                  {items.length > 0 && (
                    <button onClick={() => saveBlockAsFav(key)} title="Guardar como favorita" className="text-mut hover:text-acid text-sm">☆</button>
                  )}
                  <Button className="!py-1 !px-3 !text-xs" onClick={() => setAdding(key)}>+ Agregar</Button>
                </div>
              }
            >
              {icon} {label}
            </CardTitle>
            {items.length === 0 ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-600">Nada registrado.</span>
                {mealsForDate(s, addDays(date, -1)).some((m) => m.meal === key) && (
                  <button onClick={() => repeatBlock(key)} className="text-[11px] text-acid font-semibold">⟳ igual que ayer</button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                {items.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm bg-card2 rounded-lg px-3 py-2">
                    <button
                      className="flex-1 min-w-0 truncate text-left hover:text-acid transition"
                      title="Editar cantidad"
                      onClick={() => {
                        const v = window.prompt(`Cantidad de "${m.name}" (porciones):`, String(m.qty))
                        if (v && +v > 0) s.updateMealQty(m.id, +v)
                      }}
                    >
                      {m.name} {m.qty !== 1 && <span className="text-mut">×{m.qty}</span>}
                    </button>
                    <span className="text-xs text-mut whitespace-nowrap">{Math.round(m.kcal)} kcal · {Math.round(m.protein)}P</span>
                    <button
                      title="Duplicar"
                      onClick={() => s.addMeal({ date, meal: m.meal, name: m.name, qty: m.qty, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat })}
                      className="text-mut hover:text-acid px-1"
                    >⧉</button>
                    <button onClick={() => s.removeMeal(m.id)} className="text-mut hover:text-red-400 px-1">×</button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}

      <AddFoodModal meal={adding} date={date} onClose={() => setAdding(null)} onAdded={onFoodAdded} />

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 bg-card border border-acid/50 text-zinc-100 text-sm font-medium px-4 py-2.5 rounded-xl z-50 shadow-lg max-w-sm text-center">
          💬 {toast}
        </div>
      )}
    </div>
  )
}

// Sugerencias del coach según el entreno del día (colapsable)
function SuggestionCard({ date }: { date: string }) {
  const s = useStore()
  const [open, setOpen] = useState(true)
  const day = workoutForDate(s, date)
  const targets = calcTargets(s.profile, currentWeight(s))
  const sug = buildMealSuggestion({
    day, date, checkIn: s.checkIns[date], garminDaily: s.garmin.daily[date],
    session: s.sessions[date], targets, todayMeals: mealsForDate(s, date),
  })
  const info = DAY_TYPE_INFO[sug.type]

  const addRecipe = (r: Recipe, meal: MealType) =>
    s.addMeal({ date, meal, name: r.name, qty: 1, kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat })

  const rows: { label: string; meal: MealType; recipe?: Recipe }[] = [
    { label: 'Desayuno', meal: 'desayuno', recipe: sug.meals.desayuno },
    ...(sug.preEntreno ? [{ label: 'Pre-running', meal: 'snack' as MealType, recipe: sug.preEntreno }] : []),
    { label: 'Almuerzo', meal: 'almuerzo', recipe: sug.meals.almuerzo },
    { label: 'Cena', meal: 'cena', recipe: sug.meals.cena },
    { label: 'Snack', meal: 'snack', recipe: sug.meals.snack },
    ...(sug.postEntreno ? [{ label: 'Post-entreno', meal: 'snack' as MealType, recipe: sug.postEntreno }] : []),
    ...sug.quick.map((r) => ({ label: '⏱ Alternativa rápida', meal: r.meal, recipe: r })),
  ]

  return (
    <Card className="border-acid/30">
      <button className="w-full flex items-center justify-between" onClick={() => setOpen(!open)}>
        <span className="text-sm font-bold">{info.icon} Sugerencia del coach — {info.label.toLowerCase()}</span>
        <span className="text-mut text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-zinc-400">{sug.note}</p>
          {sug.alerts.map((a, i) => (
            <p key={i} className="text-xs text-amber-300 bg-amber-500/10 rounded-lg px-3 py-2">▲ {a}</p>
          ))}
          {rows.map(({ label, meal, recipe }) =>
            recipe ? (
              <div key={`${label}-${recipe.id}`} className="flex items-center gap-2 bg-card2 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-mut uppercase tracking-wider">{label}</div>
                  <div className="text-sm font-medium truncate">{recipe.name}</div>
                  <div className="text-[11px] text-mut">{recipe.kcal} kcal · {recipe.protein}g prot · ⏱ {recipe.time} min</div>
                </div>
                <Button className="!py-1 !px-2.5 !text-xs shrink-0" onClick={() => addRecipe(recipe, meal)}>+ Añadir</Button>
              </div>
            ) : null,
          )}
        </div>
      )}
    </Card>
  )
}

// ---------------- Modal de registro: la vida real, sin juzgar ----------------
type Tab = 'sugeridos' | 'frecuentes' | 'alimentos' | 'fuera' | 'crear'

const NOTE_TONE: Record<string, 'ok' | 'warn' | 'default' | 'acid'> = {
  ideal: 'ok', 'útil post-entreno': 'acid', ocasional: 'warn', 'alto en calorías': 'warn', estimación: 'default',
}

function AddFoodModal({ meal, date, onClose, onAdded }: {
  meal: MealType | null; date: string; onClose: () => void; onAdded: (f?: Food) => void
}) {
  const s = useStore()
  const [tab, setTab] = useState<Tab>('sugeridos')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('todas')
  const [minProt, setMinProt] = useState(false)
  const [lowKcal, setLowKcal] = useState(false)
  const [selected, setSelected] = useState<Food | null>(null)
  const [qty, setQty] = useState(1)
  const [custom, setCustom] = useState({ name: '', portion: '1 porción', kcal: '', protein: '', carbs: '', fat: '', category: 'Otro' })
  const foods = allFoods(s)

  const reset = () => { setSelected(null); setQty(1); setQ('') }
  const close = () => { reset(); setTab('sugeridos'); onClose() }

  // Frecuentes: lo que más has registrado (historial real)
  const frequents = (() => {
    const count = new Map<string, { n: number; m: (typeof s.meals)[0] }>()
    for (const m of s.meals) {
      const e = count.get(m.name)
      if (e) e.n++
      else count.set(m.name, { n: 1, m })
    }
    return [...count.values()].sort((a, b) => b.n - a.n).slice(0, 10)
  })()

  const addFood = (f: Food, n: number) => {
    s.addMeal({ date, meal: meal!, name: f.name, qty: n, kcal: f.kcal * n, protein: f.protein * n, carbs: f.carbs * n, fat: f.fat * n })
    onAdded(f)
    close()
  }

  const addItems = (items: FavMealItem[]) => {
    items.forEach((i) => s.addMeal({ date, meal: meal!, name: i.name, qty: i.qty, kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat }))
    onAdded()
    close()
  }

  const CATS = [...new Set(foods.map((f) => f.category))].sort()
  const searchPool = tab === 'fuera' ? foods.filter((f) => f.category === 'Comida fuera') : foods
  const filtered = searchPool.filter((f) => {
    if (q && !f.name.toLowerCase().includes(q.toLowerCase())) return false
    if (tab === 'alimentos') {
      if (cat !== 'todas' && f.category !== cat) return false
      if (minProt && f.protein < 15) return false
      if (lowKcal && f.kcal > 150) return false
    }
    return true
  })

  const quicks = QUICK_MEALS.filter((qm) => qm.meal === meal)
  const favs = s.favMeals.filter((f) => f.meal === meal)

  const TABS: { key: Tab; label: string }[] = [
    { key: 'sugeridos', label: '⭐' },
    { key: 'frecuentes', label: 'Frecuentes' },
    { key: 'alimentos', label: 'Alimentos' },
    { key: 'fuera', label: 'Fuera' },
    { key: 'crear', label: '+ Crear' },
  ]

  const foodRow = (f: Food) => (
    <div key={f.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition ${selected?.id === f.id ? 'bg-acid/10 border border-acid/40' : 'bg-card2'}`}>
      <button className="flex-1 min-w-0 text-left" onClick={() => { setSelected(f); setQty(1) }}>
        <div className="text-sm font-medium truncate flex items-center gap-1.5">
          {f.name}
          {f.note && <Chip tone={NOTE_TONE[f.note] ?? 'default'}>{f.note}</Chip>}
          {f.custom && <Chip tone="acid">propio</Chip>}
        </div>
        <div className="text-[11px] text-mut">{f.portion} · {f.kcal} kcal · {f.protein}P {f.carbs}C {f.fat}G</div>
      </button>
      <Button className="!py-1 !px-2.5 !text-xs shrink-0" onClick={() => addFood(f, 1)}>+</Button>
    </div>
  )

  return (
    <Modal open={!!meal} onClose={close} title={`Agregar a ${meal ?? ''}`}>
      <div className="space-y-3">
        {/* Tabs */}
        <div className="flex gap-1 bg-card2 rounded-xl p-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); reset() }}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${tab === t.key ? 'bg-acid text-black' : 'text-mut'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab !== 'crear' && tab !== 'sugeridos' && (
          <Input placeholder="Buscar... (pasta, empanada, cerveza)" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        )}

        {/* SUGERIDOS: favoritas + combos rápidos */}
        {tab === 'sugeridos' && (
          <div className="max-h-80 overflow-y-auto space-y-1.5">
            {favs.length === 0 && quicks.length === 0 && (
              <p className="text-xs text-mut text-center py-3">Guarda favoritas con ☆ en cada bloque. Mientras tanto, mira los combos:</p>
            )}
            {favs.map((f) => (
              <div key={f.id} className="flex items-center gap-2 bg-acid/5 border border-acid/20 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">⭐ {f.name}</div>
                  <div className="text-[11px] text-mut">{Math.round(f.items.reduce((a, i) => a + i.kcal, 0))} kcal · {Math.round(f.items.reduce((a, i) => a + i.protein, 0))}P</div>
                </div>
                <button onClick={() => s.removeFavMeal(f.id)} className="text-zinc-600 hover:text-red-400 px-1">×</button>
                <Button className="!py-1 !px-2.5 !text-xs" onClick={() => addItems(f.items)}>+</Button>
              </div>
            ))}
            {quicks.map((qm) => (
              <div key={qm.id} className="flex items-center gap-2 bg-card2 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{qm.name}</div>
                  <div className="text-[11px] text-mut">{Math.round(qm.items.reduce((a, i) => a + i.kcal, 0))} kcal · {Math.round(qm.items.reduce((a, i) => a + i.protein, 0))}P</div>
                </div>
                <Button className="!py-1 !px-2.5 !text-xs" onClick={() => addItems(qm.items)}>+</Button>
              </div>
            ))}
          </div>
        )}

        {/* FRECUENTES: historial real */}
        {tab === 'frecuentes' && (
          <div className="max-h-80 overflow-y-auto space-y-1.5">
            {frequents.length === 0 && <p className="text-xs text-mut text-center py-3">Aún no hay historial. Lo que registres seguido aparecerá aquí.</p>}
            {frequents
              .filter(({ m }) => !q || m.name.toLowerCase().includes(q.toLowerCase()))
              .map(({ n, m }) => {
                const per = m.qty > 0 ? { kcal: m.kcal / m.qty, protein: m.protein / m.qty, carbs: m.carbs / m.qty, fat: m.fat / m.qty } : m
                return (
                  <div key={m.name} className="flex items-center gap-2 bg-card2 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{m.name}</div>
                      <div className="text-[11px] text-mut">{Math.round(per.kcal)} kcal · {Math.round(per.protein)}P · registrado {n}×</div>
                    </div>
                    <Button
                      className="!py-1 !px-2.5 !text-xs"
                      onClick={() => {
                        s.addMeal({ date, meal: meal!, name: m.name, qty: 1, kcal: per.kcal, protein: per.protein, carbs: per.carbs, fat: per.fat })
                        onAdded()
                        close()
                      }}
                    >+</Button>
                  </div>
                )
              })}
          </div>
        )}

        {/* ALIMENTOS: base completa con filtros */}
        {tab === 'alimentos' && (
          <>
            <div className="flex gap-1.5 flex-wrap">
              <select value={cat} onChange={(e) => setCat(e.target.value)} className="bg-card2 border border-line rounded-lg px-2 py-1 text-xs">
                <option value="todas">Todas las categorías</option>
                {CATS.map((c) => <option key={c}>{c}</option>)}
              </select>
              <button onClick={() => setMinProt(!minProt)} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${minProt ? 'bg-acid text-black border-acid' : 'bg-card2 border-line text-mut'}`}>🥩 ≥15g prot</button>
              <button onClick={() => setLowKcal(!lowKcal)} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${lowKcal ? 'bg-acid text-black border-acid' : 'bg-card2 border-line text-mut'}`}>🔻 ≤150 kcal</button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {filtered.slice(0, 60).map(foodRow)}
              {filtered.length === 0 && (
                <div className="text-xs text-mut text-center py-4">
                  Sin resultados. <button className="text-acid font-semibold" onClick={() => setTab('crear')}>Créalo →</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* FUERA DE CASA */}
        {tab === 'fuera' && (
          <>
            <p className="text-[11px] text-mut">Estimaciones promedio (±20%). Ajusta la porción si fue más o menos.</p>
            <div className="max-h-64 overflow-y-auto space-y-1.5">{filtered.map(foodRow)}</div>
          </>
        )}

        {/* Panel de porción del alimento seleccionado */}
        {selected && tab !== 'crear' && (
          <div className="border-t border-line pt-3 space-y-2">
            <div className="text-sm font-semibold truncate">{selected.name}</div>
            <div className="flex gap-1.5 items-center">
              {[0.5, 1, 1.5, 2].map((n) => (
                <button key={n} onClick={() => setQty(n)} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${qty === n ? 'bg-acid text-black border-acid' : 'bg-card2 border-line text-mut'}`}>
                  ×{n}
                </button>
              ))}
              <input
                type="number" min={0.1} step={0.1} value={qty}
                onChange={(e) => setQty(Math.max(0.1, +e.target.value || 1))}
                className="w-16 bg-card2 border border-line rounded-lg px-2 py-2 text-xs text-center"
              />
            </div>
            <div className="flex items-center justify-between text-xs bg-card2 rounded-lg px-3 py-2">
              <span className="text-mut">{qty} × {selected.portion}</span>
              <span className="font-bold">{Math.round(selected.kcal * qty)} kcal · {Math.round(selected.protein * qty)}P {Math.round(selected.carbs * qty)}C {Math.round(selected.fat * qty)}G</span>
            </div>
            <Button className="w-full" onClick={() => addFood(selected, qty)}>Agregar {qty !== 1 ? `×${qty}` : ''}</Button>
          </div>
        )}

        {/* CREAR PERSONALIZADO */}
        {tab === 'crear' && (
          <div className="space-y-3">
            <Input label="Nombre" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Porción" value={custom.portion} onChange={(e) => setCustom({ ...custom, portion: e.target.value })} />
              <Input label="Calorías" type="number" value={custom.kcal} onChange={(e) => setCustom({ ...custom, kcal: e.target.value })} />
              <Input label="Proteína (g)" type="number" value={custom.protein} onChange={(e) => setCustom({ ...custom, protein: e.target.value })} />
              <Input label="Carbos (g)" type="number" value={custom.carbs} onChange={(e) => setCustom({ ...custom, carbs: e.target.value })} />
              <Input label="Grasas (g)" type="number" value={custom.fat} onChange={(e) => setCustom({ ...custom, fat: e.target.value })} />
            </div>
            <Button
              className="w-full"
              disabled={!custom.name || !custom.kcal}
              onClick={() => {
                const f = { name: custom.name, portion: custom.portion, kcal: +custom.kcal || 0, protein: +custom.protein || 0, carbs: +custom.carbs || 0, fat: +custom.fat || 0, category: custom.category }
                s.addCustomFood(f)
                s.addMeal({ date, meal: meal!, name: f.name, qty: 1, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat })
                onAdded()
                setCustom({ name: '', portion: '1 porción', kcal: '', protein: '', carbs: '', fat: '', category: 'Otro' })
                close()
              }}
            >
              Guardar y agregar
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
