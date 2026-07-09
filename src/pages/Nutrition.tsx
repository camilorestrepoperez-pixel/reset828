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
                    <span className="flex-1 min-w-0 truncate">{m.name} {m.qty !== 1 && <span className="text-mut">×{m.qty}</span>}</span>
                    <span className="text-xs text-mut whitespace-nowrap">{Math.round(m.kcal)} kcal · {Math.round(m.protein)}P</span>
                    <button onClick={() => s.removeMeal(m.id)} className="text-mut hover:text-red-400 px-1">×</button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}

      <AddFoodModal meal={adding} date={date} onClose={() => setAdding(null)} />
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
              <div key={label} className="flex items-center gap-2 bg-card2 rounded-lg px-3 py-2">
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

function AddFoodModal({ meal, date, onClose }: { meal: MealType | null; date: string; onClose: () => void }) {
  const s = useStore()
  const [q, setQ] = useState('')
  const [qty, setQty] = useState<Record<string, number>>({})
  const [showCustom, setShowCustom] = useState(false)
  const [custom, setCustom] = useState({ name: '', portion: '1 porción', kcal: '', protein: '', carbs: '', fat: '', category: 'Otro' })
  const foods = allFoods(s)
  const filtered = foods.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()))

  const add = (f: Food) => {
    const n = qty[f.id] ?? 1
    s.addMeal({
      date, meal: meal!, name: f.name, qty: n,
      kcal: f.kcal * n, protein: f.protein * n, carbs: f.carbs * n, fat: f.fat * n,
    })
    onClose()
    setQ('')
  }

  const saveCustom = () => {
    const f = {
      name: custom.name, portion: custom.portion,
      kcal: +custom.kcal || 0, protein: +custom.protein || 0, carbs: +custom.carbs || 0, fat: +custom.fat || 0,
      category: custom.category,
    }
    s.addCustomFood(f)
    s.addMeal({ date, meal: meal!, name: f.name, qty: 1, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat })
    setShowCustom(false)
    setCustom({ name: '', portion: '1 porción', kcal: '', protein: '', carbs: '', fat: '', category: 'Otro' })
    onClose()
  }

  // Combos de un tap: rápidas predefinidas + favoritas guardadas del usuario
  // Los items de favoritas/rápidas ya traen macros totales por porción
  const addItems = (items: FavMealItem[]) => {
    items.forEach((i) => s.addMeal({ date, meal: meal!, name: i.name, qty: i.qty, kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat }))
    onClose()
  }
  const quicks = QUICK_MEALS.filter((qm) => qm.meal === meal)
  const favs = s.favMeals.filter((f) => f.meal === meal)

  return (
    <Modal open={!!meal} onClose={onClose} title={`Agregar a ${meal ?? ''}`}>
      {!showCustom ? (
        <div className="space-y-3">
          {(quicks.length > 0 || favs.length > 0) && q === '' && (
            <div className="space-y-1.5">
              {favs.map((f) => (
                <div key={f.id} className="flex items-center gap-2 bg-acid/5 border border-acid/20 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">⭐ {f.name}</div>
                    <div className="text-[11px] text-mut">
                      {Math.round(f.items.reduce((a, i) => a + i.kcal, 0))} kcal · {Math.round(f.items.reduce((a, i) => a + i.protein, 0))}P · {f.items.length} items
                    </div>
                  </div>
                  <button onClick={() => s.removeFavMeal(f.id)} className="text-zinc-600 hover:text-red-400 px-1">×</button>
                  <Button className="!py-1 !px-2.5 !text-xs" onClick={() => addItems(f.items)}>+</Button>
                </div>
              ))}
              {quicks.map((qm) => (
                <div key={qm.id} className="flex items-center gap-2 bg-card2 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{qm.name}</div>
                    <div className="text-[11px] text-mut">
                      {Math.round(qm.items.reduce((a, i) => a + i.kcal, 0))} kcal · {Math.round(qm.items.reduce((a, i) => a + i.protein, 0))}P
                    </div>
                  </div>
                  <Button className="!py-1 !px-2.5 !text-xs" onClick={() => addItems(qm.items)}>+</Button>
                </div>
              ))}
              <div className="h-px bg-line my-1" />
            </div>
          )}
          <Input placeholder="Buscar alimento... (pollo, arepa, avena)" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <div className="max-h-72 overflow-y-auto space-y-1.5">
            {filtered.map((f) => (
              <div key={f.id} className="flex items-center gap-2 bg-card2 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{f.name} {f.custom && <Chip tone="acid">propio</Chip>}</div>
                  <div className="text-[11px] text-mut">{f.portion} · {f.kcal} kcal · {f.protein}P {f.carbs}C {f.fat}G</div>
                </div>
                <input
                  type="number" min={0.25} step={0.25}
                  value={qty[f.id] ?? 1}
                  onChange={(e) => setQty({ ...qty, [f.id]: +e.target.value })}
                  className="w-14 bg-bg border border-line rounded-lg px-2 py-1 text-xs text-center"
                />
                <Button className="!py-1 !px-2.5 !text-xs" onClick={() => add(f)}>+</Button>
              </div>
            ))}
            {filtered.length === 0 && <div className="text-xs text-mut text-center py-4">Sin resultados. Créalo abajo. 👇</div>}
          </div>
          <Button variant="ghost" className="w-full" onClick={() => setShowCustom(true)}>+ Crear alimento personalizado</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Input label="Nombre" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Porción" value={custom.portion} onChange={(e) => setCustom({ ...custom, portion: e.target.value })} />
            <Input label="Calorías" type="number" value={custom.kcal} onChange={(e) => setCustom({ ...custom, kcal: e.target.value })} />
            <Input label="Proteína (g)" type="number" value={custom.protein} onChange={(e) => setCustom({ ...custom, protein: e.target.value })} />
            <Input label="Carbos (g)" type="number" value={custom.carbs} onChange={(e) => setCustom({ ...custom, carbs: e.target.value })} />
            <Input label="Grasas (g)" type="number" value={custom.fat} onChange={(e) => setCustom({ ...custom, fat: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowCustom(false)}>Volver</Button>
            <Button className="flex-1" disabled={!custom.name || !custom.kcal} onClick={saveCustom}>Guardar y agregar</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
