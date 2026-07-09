import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-line rounded-2xl p-4 ${className}`}>{children}</div>
  )
}

export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-mut">{children}</h2>
      {right}
    </div>
  )
}

export function Button({
  children, onClick, variant = 'primary', className = '', disabled, type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const base =
    'rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none'
  const variants = {
    primary: 'bg-acid text-black hover:brightness-110',
    ghost: 'bg-card2 text-zinc-200 border border-line hover:border-zinc-500',
    danger: 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}

export function ProgressBar({ value, max, color = 'var(--color-acid)', h = 'h-2' }: { value: number; max: number; color?: string; h?: string }) {
  const pct = Math.min(100, Math.max(0, (value / (max || 1)) * 100))
  return (
    <div className={`w-full ${h} bg-card2 rounded-full overflow-hidden`}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div>
      <div className="text-xs text-mut uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
      {sub && <div className="text-xs text-mut mt-0.5">{sub}</div>}
    </div>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const { label, className = '', ...rest } = props
  return (
    <label className="block">
      {label && <span className="text-xs text-mut block mb-1">{label}</span>}
      <input
        {...rest}
        className={`w-full bg-card2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-acid/60 placeholder:text-zinc-600 ${className}`}
      />
    </label>
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const { label, className = '', children, ...rest } = props
  return (
    <label className="block">
      {label && <span className="text-xs text-mut block mb-1">{label}</span>}
      <select
        {...rest}
        className={`w-full bg-card2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-acid/60 ${className}`}
      >
        {children}
      </select>
    </label>
  )
}

export function Chip({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'acid' | 'warn' | 'ok' }) {
  const tones = {
    default: 'bg-card2 text-zinc-300 border-line',
    acid: 'bg-acid/10 text-acid border-acid/30',
    warn: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    ok: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  }
  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-card border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-mut hover:text-white text-2xl leading-none px-2">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Scale({ label, value, onChange, min = 1, max = 10 }: { label: string; value: number | undefined; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-mut">{label}</span>
        <span className="text-xs font-bold text-acid">{value ?? '—'}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 h-8 rounded-lg text-xs font-semibold transition ${
              value === n ? 'bg-acid text-black' : 'bg-card2 text-mut hover:text-zinc-300'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border transition ${
        value ? 'bg-acid/10 border-acid/40' : 'bg-card2 border-line'
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className={`w-6 h-6 rounded-full grid place-items-center text-sm font-bold ${value ? 'bg-acid text-black' : 'bg-line text-mut'}`}>
        {value ? '✓' : ''}
      </span>
    </button>
  )
}
