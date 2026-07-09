import { useState, type ReactNode } from 'react'
import { useStore, workoutForDate } from '../store/useStore'
import { todayStr, addDays, weekStart } from '../lib/calc'
import * as garminAuth from '../services/garmin/garminAuthService'
import { sync as garminSync } from '../services/garmin/garminSyncService'
import { sendWorkoutToGarmin, sendWeekToGarmin } from '../services/garmin/garminTrainingService'
import * as stravaSvc from '../services/strava/stravaService'
import * as appleSvc from '../services/appleHealth/appleHealthService'
import { ACTIVITY_META, activitySummary } from '../services/garmin/garminActivityMapper'
import { recoveryStatus } from '../services/garmin/garminHealthMapper'
import { unifiedActivities, SOURCE_META } from '../services/unifiedActivityService'
import { Card, CardTitle, Button, Chip } from '../components/ui'

const fmtSync = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Nunca'

function ConnectionCard({ title, icon, connected, demo, lastSync, msg, children, extra }: {
  title: string; icon: string; connected: boolean; demo: boolean; lastSync?: string; msg?: string
  children: ReactNode; extra?: ReactNode
}) {
  return (
    <Card className={connected ? 'border-acid/40' : ''}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-acid' : 'bg-zinc-600'}`} />
            <span className="font-bold">{icon} {title} — {connected ? (demo ? 'demo' : 'conectado') : 'sin conexión'}</span>
          </div>
          <div className="text-xs text-mut mt-1">Última sincronización: {fmtSync(lastSync)}</div>
        </div>
        <div className="flex gap-2 flex-wrap">{children}</div>
      </div>
      {msg && <p className="text-xs text-zinc-300 bg-card2 rounded-lg px-3 py-2 mt-3">{msg}</p>}
      {extra}
    </Card>
  )
}

export default function Garmin() {
  const s = useStore()
  const [busy, setBusy] = useState(false)
  const [gMsg, setGMsg] = useState('')
  const [stMsg, setStMsg] = useState('')
  const [apMsg, setApMsg] = useState('')
  const today = todayStr()
  const todayData = s.garmin.daily[today]
  const recovery = recoveryStatus(todayData)

  const activities = unifiedActivities({ garmin: s.garmin, strava: s.strava, apple: s.apple, sessions: s.sessions, plan: s.plan })

  // ---- Garmin ----
  const gConnect = async () => {
    const res = await garminAuth.connect()
    if (!res.ok) setGMsg(res.message)
  }
  const gSync = async () => {
    setBusy(true); setGMsg('Sincronizando...')
    const res = await garminSync({ demo: s.garmin.demo, days: 7 })
    if (res.ok) s.applyGarminSync(res.daily, res.activities, res.syncedAt)
    setGMsg(res.ok ? `✓ ${res.message}` : res.message)
    setBusy(false)
  }
  const gSendToday = async () => {
    setBusy(true)
    const res = await sendWorkoutToGarmin(workoutForDate(s, today), today, s.garmin.demo)
    if (res.ok) s.markGarminSent(today)
    setGMsg(res.ok ? `✓ ${res.message}` : res.message)
    setBusy(false)
  }
  const gSendWeek = async () => {
    setBusy(true)
    const ws = weekStart(today)
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(ws, i)
      return { day: workoutForDate(s, date), date }
    })
    const res = await sendWeekToGarmin(days, s.garmin.demo)
    if (res.ok) days.forEach(({ date }) => s.markGarminSent(date))
    setGMsg(res.ok ? `✓ ${res.message}` : res.message)
    setBusy(false)
  }

  // ---- Strava ----
  const stConnect = () => {
    const res = stravaSvc.startAuth()
    if (!res.ok) setStMsg(res.message!)
  }
  const stSync = async () => {
    setBusy(true); setStMsg('Sincronizando...')
    const res = await stravaSvc.sync({ demo: s.strava.demo, days: 14 })
    if (res.ok) s.applyStravaSync(res.activities, res.syncedAt)
    setStMsg(res.ok ? `✓ ${res.message}` : res.message)
    setBusy(false)
  }

  // ---- Apple ----
  const apSync = async () => {
    setBusy(true); setApMsg('Sincronizando...')
    const res = await appleSvc.sync({ demo: s.apple.demo, days: 7 })
    if (res.ok) s.applyAppleSync(res.daily, res.activities, res.syncedAt)
    setApMsg(res.ok ? `✓ ${res.message}` : res.message)
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Conexiones</h1>
        <p className="text-sm text-mut mt-1">Garmin, Strava y Apple Health — datos reales del reloj a tu plan.</p>
      </div>

      {/* GARMIN */}
      <ConnectionCard
        title="Garmin" icon="⌚" connected={s.garmin.connected} demo={s.garmin.demo}
        lastSync={s.garmin.lastSync} msg={gMsg}
        extra={
          <>
            {!garminAuth.isConfigured() && !s.garmin.demo && (
              <p className="text-xs text-mut mt-3">
                Conexión real: Health API + Activity API + Training API (OAuth2 PKCE). Requiere{' '}
                <code className="text-zinc-400">VITE_GARMIN_CLIENT_ID</code>, <code className="text-zinc-400">VITE_GARMIN_CLIENT_SECRET</code> (en backend),{' '}
                <code className="text-zinc-400">VITE_GARMIN_REDIRECT_URI</code> y <code className="text-zinc-400">VITE_GARMIN_TOKEN_PROXY</code>.
              </p>
            )}
            {s.garmin.connected && (
              <div className="flex gap-2 flex-wrap mt-3 pt-3 border-t border-line/60">
                <Button variant="ghost" className="!text-xs" disabled={busy} onClick={gSendToday}>
                  {s.garminSent[today] ? '✓ Entreno enviado hoy' : '📤 Enviar entreno de hoy'}
                </Button>
                <Button variant="ghost" className="!text-xs" disabled={busy} onClick={gSendWeek}>📅 Enviar plan semanal</Button>
              </div>
            )}
          </>
        }
      >
        {!s.garmin.demo && <Button variant="ghost" disabled={busy} onClick={gConnect}>Conectar Garmin</Button>}
        <Button variant={s.garmin.demo ? 'danger' : 'ghost'} onClick={() => s.setGarminDemo(!s.garmin.demo)}>
          {s.garmin.demo ? 'Salir de demo' : 'Modo demo'}
        </Button>
        {s.garmin.connected && <Button disabled={busy} onClick={gSync}>⟳ Sincronizar</Button>}
      </ConnectionCard>

      {/* Hoy según Garmin */}
      {todayData && (
        <Card>
          <CardTitle right={recovery && <Chip tone={recovery.level === 'buena' ? 'ok' : recovery.level === 'media' ? 'warn' : 'default'}>Recuperación {recovery.level}</Chip>}>
            Hoy según Garmin
          </CardTitle>
          {recovery && <p className="text-sm text-zinc-300 mb-3">{recovery.message}</p>}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            {([
              ['Pasos', todayData.steps.toLocaleString('es-CO')],
              ['Sueño', `${todayData.sleepHours}h`],
              ['Estrés', `${todayData.stress}`],
              ['Body Battery', `${todayData.bodyBattery}`],
              ['Cal. activas', `${todayData.activeCalories}`],
              ['FC reposo', `${todayData.restingHR}`],
            ] as const).map(([l, v]) => (
              <div key={l} className="bg-card2 rounded-xl p-2.5">
                <div className="font-bold text-sm">{v}</div>
                <div className="text-[10px] text-mut">{l}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* STRAVA */}
      <ConnectionCard
        title="Strava" icon="🟠" connected={s.strava.connected} demo={s.strava.demo}
        lastSync={s.strava.lastSync} msg={stMsg}
        extra={
          !stravaSvc.isConfigured() && !s.strava.demo ? (
            <p className="text-xs text-mut mt-3">
              Importa running, caminatas y cycling realizados (no planifica). Requiere{' '}
              <code className="text-zinc-400">VITE_STRAVA_CLIENT_ID</code>, <code className="text-zinc-400">VITE_STRAVA_CLIENT_SECRET</code> (backend) y{' '}
              <code className="text-zinc-400">VITE_STRAVA_REDIRECT_URI</code>.
            </p>
          ) : undefined
        }
      >
        {!s.strava.demo && <Button variant="ghost" disabled={busy} onClick={stConnect}>Conectar Strava</Button>}
        <Button variant={s.strava.demo ? 'danger' : 'ghost'} onClick={() => s.setStravaDemo(!s.strava.demo)}>
          {s.strava.demo ? 'Salir de demo' : 'Modo demo'}
        </Button>
        {s.strava.connected && <Button disabled={busy} onClick={stSync}>⟳ Sincronizar</Button>}
      </ConnectionCard>

      {/* APPLE HEALTH */}
      <ConnectionCard
        title="Apple Health" icon="🍎" connected={s.apple.connected} demo={s.apple.demo}
        lastSync={s.apple.lastSync} msg={apMsg}
        extra={
          appleSvc.availability() === 'web-unavailable' && !s.apple.demo ? (
            <p className="text-xs text-mut mt-3">
              HealthKit no es accesible desde web/PWA — la capa queda lista para el empaque iOS nativo (Capacitor).
              Mientras tanto: modo demo o registro manual en el check-in.
            </p>
          ) : undefined
        }
      >
        <Button variant={s.apple.demo ? 'danger' : 'ghost'} onClick={() => s.setAppleDemo(!s.apple.demo)}>
          {s.apple.demo ? 'Salir de demo' : 'Modo demo'}
        </Button>
        {s.apple.connected && <Button disabled={busy} onClick={apSync}>⟳ Sincronizar</Button>}
      </ConnectionCard>

      {/* Actividades unificadas */}
      <Card>
        <CardTitle>Actividades (todas las fuentes, sin duplicados)</CardTitle>
        {activities.length === 0 ? (
          <div className="text-sm text-mut py-4 text-center">Activa un modo demo y sincroniza, o termina una sesión en la app.</div>
        ) : (
          <div className="space-y-2">
            {activities.slice(0, 10).map((a) => {
              const meta = ACTIVITY_META[a.type]
              const src = SOURCE_META[a.source]
              return (
                <div key={a.id} className="flex items-center gap-3 bg-card2 rounded-xl px-3 py-2.5">
                  <span className="text-lg">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{a.name}</div>
                    <div className="text-[11px] text-mut">{a.date} · {activitySummary({ ...a, calories: a.calories ?? 0 } as never)}</div>
                  </div>
                  <Chip>{src.icon} {src.label}</Chip>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <p className="text-[11px] text-zinc-600">
        Solo APIs oficiales (Garmin Connect API, Strava API v3, HealthKit). Sin scraping. Los secrets viven en el
        backend/.env, nunca en el código. Prioridad de fuentes: Garmin para salud, Strava para actividades, Apple para
        pasos diarios, manual como respaldo.
      </p>
    </div>
  )
}
