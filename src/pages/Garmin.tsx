import { useState, type ReactNode } from 'react'
import { useStore, workoutForDate } from '../store/useStore'
import { todayStr, addDays, weekStart } from '../lib/calc'
import * as garminAuth from '../services/garmin/garminAuthService'
import { sync as garminSync } from '../services/garmin/garminSyncService'
import { sendWorkoutToGarmin, sendWeekToGarmin } from '../services/garmin/garminTrainingService'
import { parseGarminCsv } from '../services/garmin/garminCsvImport'
import * as stravaSvc from '../services/strava/stravaService'
import * as appleSvc from '../services/appleHealth/appleHealthService'
import { ACTIVITY_META, activitySummary } from '../services/garmin/garminActivityMapper'
import { recoveryStatus } from '../services/garmin/garminHealthMapper'
import { unifiedActivities, SOURCE_META } from '../services/unifiedActivityService'
import { Card, CardTitle, Button, Chip } from '../components/ui'

const fmtSync = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Nunca'

// Datos que RESET 828 solicita autorización para sincronizar
const GARMIN_PERMISSIONS = [
  '👟 Pasos', '😴 Sueño', '❤️ Frecuencia cardiaca', '🧠 Estrés',
  '🔋 Body Battery', '🔥 Calorías activas', '🏃 Actividades deportivas',
  '📏 Distancia', '⏱️ Tiempo y ritmo', '🏋️ Entrenamientos',
]

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
  const [gConsent, setGConsent] = useState(false) // pantalla de autorización visible
  const today = todayStr()
  const todayData = s.garmin.daily[today]
  const recovery = recoveryStatus(todayData)

  const activities = unifiedActivities({ garmin: s.garmin, strava: s.strava, apple: s.apple, sessions: s.sessions, plan: s.plan })

  // ---- Garmin ----
  const gConnect = async () => {
    if (garminAuth.isConfigured()) {
      // OAuth real: redirige a Garmin
      const res = await garminAuth.connect()
      if (!res.ok) setGMsg(res.message)
      return
    }
    // Sin credenciales: caemos a demo con aviso, como fallback
    s.setGarminDemo(true)
    setGConsent(false)
    setGMsg('Faltan credenciales Garmin. Activé el modo demo para que pruebes el flujo — la app queda lista para conexión real cuando se configuren. Dale a "Sincronizar".')
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

  // ---- Importar CSV de Garmin Connect (sin API, gratis) ----
  const importCsv = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const res = parseGarminCsv(String(reader.result))
      if (res.ok) {
        s.applyGarminSync({}, res.activities, new Date().toISOString())
        setGMsg(`✓ ${res.message}`)
      } else {
        setGMsg(res.message)
      }
    }
    reader.readAsText(file)
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
            {/* Pantalla de autorización explícita (antes de conectar) */}
            {gConsent && !s.garmin.connected && (
              <div className="mt-3 pt-3 border-t border-line/60 space-y-3">
                <p className="text-sm text-zinc-300">
                  Para sincronizar pasos, sueño, actividades, calorías, frecuencia cardiaca y entrenamientos,
                  RESET 828 necesita <b>autorización de tu cuenta Garmin</b>. Nada se sincroniza sin tu permiso,
                  y puedes desconectar cuando quieras.
                </p>
                <div>
                  <div className="text-[10px] text-mut uppercase tracking-wider mb-1.5">Datos que se solicitan</div>
                  <div className="flex flex-wrap gap-1.5">
                    {GARMIN_PERMISSIONS.map((perm) => (
                      <span key={perm} className="text-[11px] bg-card2 border border-line rounded-full px-2.5 py-1">{perm}</span>
                    ))}
                  </div>
                </div>
                {!garminAuth.isConfigured() && (
                  <p className="text-xs text-amber-300 bg-amber-500/10 rounded-lg px-3 py-2">
                    ⚠️ Faltan credenciales Garmin. La app queda lista para conexión real cuando se configuren
                    (<code>VITE_GARMIN_CLIENT_ID</code>, <code>VITE_GARMIN_REDIRECT_URI</code>, <code>VITE_GARMIN_TOKEN_PROXY</code>).
                    Mientras tanto puedes usar el modo demo.
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button disabled={busy} onClick={gConnect}>Autorizar y conectar</Button>
                  <Button variant="ghost" onClick={() => { setGConsent(false); s.setGarminDemo(true) }}>Usar modo manual / demo</Button>
                  <Button variant="ghost" onClick={() => setGConsent(false)}>Cancelar</Button>
                </div>
              </div>
            )}

            {/* Enviar entrenos a Garmin */}
            <div className="flex gap-2 flex-wrap mt-3 pt-3 border-t border-line/60">
              {s.garmin.connected ? (
                <>
                  <Button variant="ghost" className="!text-xs" disabled={busy} onClick={gSendToday}>
                    {s.garminSent[today] ? '✓ Entreno enviado hoy' : '📤 Enviar entreno de hoy'}
                  </Button>
                  <Button variant="ghost" className="!text-xs" disabled={busy} onClick={gSendWeek}>📅 Enviar plan semanal</Button>
                  {!garminAuth.isConfigured() && (
                    <p className="w-full text-[11px] text-mut mt-1">
                      Función preparada. El envío real requiere credenciales oficiales de la Garmin Training API.
                    </p>
                  )}
                </>
              ) : (
                <Button variant="ghost" className="!text-xs" disabled onClick={() => {}}>
                  📤 Conecta Garmin para enviar entrenamientos
                </Button>
              )}
            </div>

            {/* Importación manual: la vía gratis sin API (fallback siempre disponible) */}
            <div className="mt-3 pt-3 border-t border-line/60">
              <label className="inline-block rounded-xl px-4 py-2 text-xs font-semibold bg-card2 text-zinc-200 border border-line hover:border-acid/50 cursor-pointer transition">
                📥 Importar CSV de Garmin Connect
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) importCsv(e.target.files[0]); e.target.value = '' }}
                />
              </label>
              <p className="text-[11px] text-mut mt-1.5">
                Registro manual siempre disponible, con o sin Garmin: en <b>connect.garmin.com</b> → Actividades → Exportar CSV.
                Tus entrenos reales entran a "Plan vs realizado" y Progreso.
              </p>
            </div>
          </>
        }
      >
        {s.garmin.connected ? (
          <>
            <Button disabled={busy} onClick={gSync}>⟳ Sincronizar</Button>
            <Button variant="danger" onClick={() => { s.disconnectGarmin(); setGMsg('Garmin desconectado. Tus datos manuales siguen intactos.') }}>Desconectar</Button>
          </>
        ) : (
          <Button onClick={() => setGConsent(true)}>Conectar Garmin</Button>
        )}
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
