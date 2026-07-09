import { useState } from 'react'
import { useStore } from '../store/useStore'
import { todayStr } from '../lib/calc'
import { RECIPES } from '../data/recipes'
import { MENU78 } from '../data/menu78'
import { Card, Button, Chip, Modal, Select } from '../components/ui'
import type { Recipe, MealType, RecipeCategory } from '../types'

const ALL_RECIPES: Recipe[] = [...MENU78, ...RECIPES]

const CAT_FILTERS: { key: RecipeCategory | 'todas'; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'desayuno', label: 'Desayuno' },
  { key: 'almuerzo', label: 'Almuerzo' },
  { key: 'cena', label: 'Cena' },
  { key: 'snack', label: 'Snack' },
  { key: 'post-entreno', label: 'Post-entreno' },
]

const catOf = (r: Recipe): RecipeCategory => r.category ?? (r.meal === 'bebida' ? 'snack' : (r.meal as RecipeCategory))

export default function Recipes() {
  const s = useStore()
  const [filter, setFilter] = useState<RecipeCategory | 'todas'>('todas')
  const [dayType, setDayType] = useState('todos')
  const [minProt, setMinProt] = useState(0)
  const [maxKcal, setMaxKcal] = useState(0)
  const [maxTime, setMaxTime] = useState(0)
  const [open, setOpen] = useState<Recipe | null>(null)
  const [toast, setToast] = useState('')

  const list = ALL_RECIPES.filter((r) => {
    if (filter !== 'todas' && catOf(r) !== filter) return false
    if (dayType !== 'todos' && !(r.idealFor ?? []).includes(dayType)) return false
    if (minProt && r.protein < minProt) return false
    if (maxKcal && r.kcal > maxKcal) return false
    if (maxTime && r.time > maxTime) return false
    return true
  })

  const addToDay = (r: Recipe) => {
    s.addMeal({
      date: todayStr(), meal: r.meal, name: r.name, qty: 1,
      kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat,
    })
    flash(`"${r.name}" agregada a ${r.meal} de hoy`)
  }

  const addToGrocery = (r: Recipe) => {
    s.addIngredientsToGrocery(r.ingredients)
    flash('Ingredientes agregados a la lista de mercado')
  }

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Recetas</h1>
      <p className="text-sm text-mut -mt-2">Sin espinaca. Sin huevo duro. Todo de supermercado colombiano.</p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {CAT_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition ${
              filter === f.key ? 'bg-acid text-black border-acid' : 'bg-card2 border-line text-mut'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filtros finos: tipo de día, proteína, calorías, tiempo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Select value={dayType} onChange={(e) => setDayType(e.target.value)}>
          <option value="todos">Tipo de día: todos</option>
          <option value="fuerza">🏋️ Fuerza</option>
          <option value="pierna">🦵 Pierna</option>
          <option value="running">🏃 Running</option>
          <option value="funcional">⚡ Funcional</option>
          <option value="descanso">🧘 Descanso</option>
          <option value="rápida">⏱ Poco tiempo</option>
        </Select>
        <Select value={minProt} onChange={(e) => setMinProt(+e.target.value)}>
          <option value={0}>Proteína: todas</option>
          <option value={30}>≥ 30g</option>
          <option value={40}>≥ 40g</option>
          <option value={50}>≥ 50g</option>
        </Select>
        <Select value={maxKcal} onChange={(e) => setMaxKcal(+e.target.value)}>
          <option value={0}>Calorías: todas</option>
          <option value={300}>≤ 300 kcal</option>
          <option value={450}>≤ 450 kcal</option>
          <option value={600}>≤ 600 kcal</option>
        </Select>
        <Select value={maxTime} onChange={(e) => setMaxTime(+e.target.value)}>
          <option value={0}>Tiempo: todos</option>
          <option value={5}>≤ 5 min</option>
          <option value={15}>≤ 15 min</option>
          <option value={25}>≤ 25 min</option>
        </Select>
      </div>
      <div className="text-xs text-mut -mt-1">{list.length} {list.length === 1 ? 'receta' : 'recetas'}</div>

      <div className="grid sm:grid-cols-2 gap-3">
        {list.map((r) => (
          <Card key={r.id} className="flex flex-col">
            <button className="text-left flex-1" onClick={() => setOpen(r)}>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Chip tone="acid">{catOf(r)}</Chip>
                {r.tags.slice(0, 2).map((t) => <Chip key={t}>{t}</Chip>)}
              </div>
              <div className="font-bold">{r.num ? <span className="text-mut">#{r.num} </span> : null}{r.name}</div>
              <div className="text-xs text-mut mt-1">
                {r.kcal} kcal · {r.protein}P {r.carbs}C {r.fat}G · ⏱ {r.time} min · {r.difficulty}
              </div>
              {r.idealFor && r.idealFor.length > 0 && (
                <div className="text-[11px] text-zinc-500 mt-0.5">Ideal: {r.idealFor.join(' · ')}</div>
              )}
            </button>
            <div className="flex gap-2 mt-3">
              <Button className="flex-1 !py-2 !text-xs" onClick={() => addToDay(r)}>+ Al día de hoy</Button>
              <Button variant="ghost" className="flex-1 !py-2 !text-xs" onClick={() => addToGrocery(r)}>🛒 Al mercado</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''}>
        {open && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Chip tone="acid">{open.meal}</Chip>
              {open.tags.map((t) => <Chip key={t}>{t}</Chip>)}
              <Chip>⏱ {open.time} min</Chip>
              <Chip>{open.difficulty}</Chip>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {([['kcal', open.kcal], ['Prot', `${open.protein}g`], ['Carb', `${open.carbs}g`], ['Grasa', `${open.fat}g`]] as const).map(([l, v]) => (
                <div key={l} className="bg-card2 rounded-xl py-2">
                  <div className="font-bold text-sm">{v}</div>
                  <div className="text-[10px] text-mut">{l}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs font-semibold text-mut uppercase tracking-wider mb-2">Ingredientes</div>
              <ul className="space-y-1 text-sm">
                {open.ingredients.map((i) => (
                  <li key={i.name} className="flex justify-between gap-2">
                    <span>{i.name}</span><span className="text-mut">{i.qty}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-mut uppercase tracking-wider mb-2">Preparación</div>
              <ol className="space-y-1.5 text-sm list-decimal list-inside text-zinc-300">
                {open.steps.map((st, i) => <li key={i}>{st}</li>)}
              </ol>
            </div>
            {open.swaps && <p className="text-xs text-mut bg-card2 rounded-lg px-3 py-2">🔁 Reemplazo: {open.swaps}</p>}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => { addToDay(open); setOpen(null) }}>+ Al día de hoy</Button>
              <Button variant="ghost" className="flex-1" onClick={() => addToGrocery(open)}>🛒 Ingredientes al mercado</Button>
            </div>
          </div>
        )}
      </Modal>

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 bg-acid text-black text-sm font-semibold px-4 py-2.5 rounded-xl z-50 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
