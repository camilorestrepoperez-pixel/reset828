import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { calcStreak } from '../lib/calc'

// Nav principal: lo que se usa todos los días (bottom nav móvil)
const NAV = [
  { to: '/', label: 'Inicio', icon: '⌂' },
  { to: '/calendario', label: 'Calendario', icon: '▦' },
  { to: '/entreno', label: 'Entreno', icon: '⚡' },
  { to: '/nutricion', label: 'Comida', icon: '◐' },
  { to: '/checkin', label: 'Check-in', icon: '✓' },
]

// Menú secundario ("Más" en móvil, sidebar completa en desktop)
const NAV_EXTRA = [
  { to: '/progreso', label: 'Progreso', icon: '↗' },
  { to: '/plan', label: 'Plan semanal', icon: '≡' },
  { to: '/recetas', label: 'Recetas', icon: '☰' },
  { to: '/mercado', label: 'Mercado', icon: '⊞' },
  { to: '/garmin', label: 'Conexiones', icon: '⌚' },
  { to: '/perfil', label: 'Perfil', icon: '◎' },
]

export default function Layout() {
  const checkIns = useStore((s) => s.checkIns)
  const garmin = useStore((s) => s.garmin)
  const streak = calcStreak(checkIns)
  const loc = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const linkCls = (isActive: boolean) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
      isActive ? 'bg-acid/10 text-acid' : 'text-mut hover:text-zinc-200 hover:bg-card2'
    }`

  const isExtraActive = NAV_EXTRA.some((n) => loc.pathname === n.to)

  return (
    <div className="min-h-screen bg-bg">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 flex-col border-r border-line bg-card p-4 z-40 overflow-y-auto">
        <div className="mb-6 px-2">
          <div className="text-xl font-black tracking-tight">
            RESET<span className="text-acid">828</span>
          </div>
          <div className="text-[11px] text-mut mt-0.5">88 → 78 kg · sin excusas</div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => linkCls(isActive)}>
              <span className="w-5 text-center">{n.icon}</span> {n.label}
            </NavLink>
          ))}
          <div className="h-px bg-line my-2" />
          {NAV_EXTRA.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => linkCls(isActive)}>
              <span className="w-5 text-center">{n.icon}</span> {n.label}
              {n.to === '/garmin' && garmin.connected && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-acid" />}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-2 py-3 rounded-xl bg-card2 border border-line">
          <div className="text-xs text-mut">Racha actual</div>
          <div className="text-lg font-bold text-acid">🔥 {streak} {streak === 1 ? 'día' : 'días'}</div>
        </div>
      </aside>

      {/* Header móvil */}
      <header className="md:hidden sticky top-0 z-40 bg-bg/90 backdrop-blur border-b border-line px-4 py-3 flex items-center justify-between">
        <div className="text-lg font-black tracking-tight">
          RESET<span className="text-acid">828</span>
        </div>
        <span className="text-xs font-bold text-acid">🔥 {streak}</span>
      </header>

      {/* Contenido */}
      <main className="md:ml-56 px-4 md:px-8 py-5 pb-24 md:pb-8 max-w-5xl">
        <Outlet />
      </main>

      {/* Sheet "Más" móvil */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70 flex items-end" onClick={() => setMoreOpen(false)}>
          <div className="w-full bg-card border-t border-line rounded-t-2xl p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-line rounded-full mx-auto mb-4" />
            <div className="grid grid-cols-3 gap-2">
              {NAV_EXTRA.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1.5 py-4 rounded-xl border text-xs font-medium ${
                      isActive ? 'border-acid/50 text-acid bg-acid/5' : 'border-line bg-card2 text-zinc-300'
                    }`
                  }
                >
                  <span className="text-xl">{n.icon}</span>
                  {n.label}
                  {n.to === '/garmin' && garmin.connected && <span className="text-[9px] text-acid">● conectado</span>}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav móvil */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-line flex justify-around px-1 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg min-w-12 ${
                isActive ? 'text-acid' : 'text-mut'
              }`
            }
          >
            <span className="text-base leading-none">{n.icon}</span>
            <span className="text-[10px] font-medium">{n.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg min-w-12 ${
            isExtraActive ? 'text-acid' : 'text-mut'
          }`}
        >
          <span className="text-base leading-none">⋯</span>
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </nav>
    </div>
  )
}
