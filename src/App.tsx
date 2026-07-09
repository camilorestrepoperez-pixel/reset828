import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { useStore } from './store/useStore'
import { handleCallback as stravaCallback, sync as stravaSync } from './services/strava/stravaService'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import WeekPlan from './pages/WeekPlan'
import WorkoutDay from './pages/WorkoutDay'
import Nutrition from './pages/Nutrition'
import Recipes from './pages/Recipes'
import Grocery from './pages/Grocery'
import CheckIn from './pages/CheckIn'
import Progress from './pages/Progress'
import Calendar from './pages/Calendar'
import Garmin from './pages/Garmin'

export default function App() {
  // Callback OAuth: Strava devuelve a la app con ?code=...&state=strava
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    if (!code || state !== 'strava') return
    // limpiar la URL antes de procesar (evita reintentos al recargar)
    window.history.replaceState({}, '', window.location.pathname + window.location.hash)
    stravaCallback(code).then(async (res) => {
      if (res.ok) {
        useStore.getState().setStravaConnected(true)
        const sync = await stravaSync({ demo: false, days: 14 })
        if (sync.ok) useStore.getState().applyStravaSync(sync.activities, sync.syncedAt)
        window.location.hash = '#/garmin'
      } else {
        alert(res.message)
      }
    })
  }, [])

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/plan" element={<WeekPlan />} />
          <Route path="/entreno" element={<WorkoutDay />} />
          <Route path="/nutricion" element={<Nutrition />} />
          <Route path="/recetas" element={<Recipes />} />
          <Route path="/mercado" element={<Grocery />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/progreso" element={<Progress />} />
          <Route path="/calendario" element={<Calendar />} />
          <Route path="/garmin" element={<Garmin />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
