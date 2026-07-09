import { useState } from 'react'
import { useStore } from '../store/useStore'
import { GROCERY_CATEGORIES } from '../data/grocery'
import { Card, Button, Input, Select, Modal } from '../components/ui'

export default function Grocery() {
  const s = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [days, setDays] = useState<3 | 5 | 7>(7)
  const [form, setForm] = useState({ name: '', qty: '', category: 'Proteínas' })
  const [copied, setCopied] = useState(false)

  const total = s.grocery.length
  const bought = s.grocery.filter((g) => g.checked).length

  // Ajuste simple de cantidades por días (solo texto informativo)
  const factor = days / 7

  const copyList = async () => {
    const lines: string[] = [`🛒 RESET 78 — Mercado (${days} días)`, '']
    for (const cat of GROCERY_CATEGORIES) {
      const items = s.grocery.filter((g) => g.category === cat && !g.checked)
      if (items.length === 0) continue
      lines.push(`*${cat}*`)
      items.forEach((i) => lines.push(`- ${i.name} — ${i.qty}`))
      lines.push('')
    }
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Mercado</h1>
        <div className="text-sm text-mut">{bought}/{total} ✓</div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {([3, 5, 7] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
              days === d ? 'bg-acid text-black border-acid' : 'bg-card2 border-line text-mut'
            }`}
          >
            {d} días
          </button>
        ))}
        <div className="flex-1" />
        <Button variant="ghost" className="!py-1.5 !text-xs" onClick={copyList}>{copied ? '✓ Copiada' : '⧉ Copiar lista'}</Button>
        <Button variant="ghost" className="!py-1.5 !text-xs" onClick={s.resetGroceryChecks}>↺ Desmarcar todo</Button>
      </div>
      {days !== 7 && (
        <p className="text-xs text-amber-400/90 bg-amber-500/10 rounded-lg px-3 py-2">
          Lista base para 7 días — para {days} días compra ≈ {Math.round(factor * 100)}% de cada cantidad.
        </p>
      )}

      {GROCERY_CATEGORIES.map((cat) => {
        const items = s.grocery.filter((g) => g.category === cat)
        if (items.length === 0) return null
        return (
          <Card key={cat}>
            <div className="text-xs font-semibold uppercase tracking-wider text-mut mb-2.5">{cat}</div>
            <div className="space-y-1.5">
              {items.map((g) => (
                <div key={g.id} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${g.checked ? 'bg-card2/50' : 'bg-card2'}`}>
                  <button
                    onClick={() => s.toggleGrocery(g.id)}
                    aria-label={`Marcar ${g.name}`}
                    className={`w-6 h-6 shrink-0 rounded-md grid place-items-center text-xs font-bold border transition ${
                      g.checked ? 'bg-acid text-black border-acid' : 'border-line text-transparent hover:border-acid/50'
                    }`}
                  >
                    ✓
                  </button>
                  <span className={`flex-1 text-sm min-w-0 truncate ${g.checked ? 'line-through text-mut' : ''}`}>{g.name}</span>
                  <input
                    value={g.qty}
                    onChange={(e) => s.updateGroceryQty(g.id, e.target.value)}
                    className="w-28 bg-transparent border border-line/50 rounded-lg px-2 py-1 text-xs text-mut text-right focus:border-acid/50 outline-none"
                  />
                  <button onClick={() => s.removeGroceryItem(g.id)} className="text-zinc-600 hover:text-red-400 px-1">×</button>
                </div>
              ))}
            </div>
          </Card>
        )
      })}

      <Button variant="ghost" className="w-full" onClick={() => setShowAdd(true)}>+ Agregar producto</Button>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Agregar producto">
        <div className="space-y-3">
          <Input label="Producto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cantidad" placeholder="500 g" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
            <Select label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {GROCERY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </div>
          <Button
            className="w-full"
            disabled={!form.name}
            onClick={() => {
              s.addGroceryItem(form)
              setForm({ name: '', qty: '', category: 'Proteínas' })
              setShowAdd(false)
            }}
          >
            Agregar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
