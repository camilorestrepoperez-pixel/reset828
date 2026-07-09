// Importa actividades desde el CSV que exporta Garmin Connect (web):
// connect.garmin.com → Actividades → Todas las actividades → Exportar CSV.
// Sin API, sin OAuth, gratis — la vía manual para datos reales del reloj.
import type { GarminActivity, GarminActivityType } from '../../types'

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let cur = ''
  let row: string[] = []
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++ } else inQ = false
      } else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { row.push(cur.trim()); cur = '' }
    else if (ch === '\n') { row.push(cur.trim()); if (row.some(Boolean)) rows.push(row); row = []; cur = '' }
    else if (ch !== '\r') cur += ch
  }
  row.push(cur.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

const findCol = (headers: string[], ...needles: string[]) =>
  headers.findIndex((h) => needles.some((n) => h.toLowerCase().includes(n)))

function mapType(raw: string): GarminActivityType {
  const t = raw.toLowerCase()
  if (/carrera|running|trail|trote/.test(t)) return 'running'
  if (/fuerza|strength|pesas|gimnasio/.test(t)) return 'strength'
  if (/cardio|hiit|funcional|training/.test(t)) return 'functional'
  return 'walking' // caminar, senderismo, ciclismo y demás
}

const num = (raw: string): number | undefined => {
  if (!raw || raw === '--') return undefined
  // formato español: coma decimal
  const clean = raw.includes(',') && !raw.includes('.') ? raw.replace(',', '.') : raw.replace(/,/g, '')
  const n = parseFloat(clean)
  return isNaN(n) ? undefined : n
}

const toMinutes = (raw: string): number => {
  const parts = raw.split(':').map(Number)
  if (parts.some(isNaN)) return 0
  if (parts.length === 3) return Math.round(parts[0] * 60 + parts[1] + parts[2] / 60)
  if (parts.length === 2) return Math.round(parts[0] + parts[1] / 60)
  return Math.round(parts[0] ?? 0)
}

export interface CsvImportResult {
  ok: boolean
  message: string
  activities: GarminActivity[]
}

export function parseGarminCsv(text: string): CsvImportResult {
  const rows = parseCsv(text)
  if (rows.length < 2) return { ok: false, message: 'El archivo no tiene datos. ¿Exportaste el CSV correcto?', activities: [] }

  const headers = rows[0]
  const cols = {
    type: findCol(headers, 'tipo de actividad', 'activity type'),
    date: findCol(headers, 'fecha', 'date'),
    title: findCol(headers, 'título', 'titulo', 'title'),
    distance: findCol(headers, 'distancia', 'distance'),
    calories: findCol(headers, 'calorías', 'calorias', 'calories'),
    time: findCol(headers, 'tiempo', 'time'),
    hr: findCol(headers, 'frecuencia cardiaca media', 'frecuencia cardíaca media', 'avg hr', 'average heart'),
  }
  if (cols.date < 0 || cols.type < 0) {
    return { ok: false, message: `No reconozco las columnas (encontré: ${headers.slice(0, 5).join(', ')}...). Exporta desde Garmin Connect → Actividades.`, activities: [] }
  }

  const activities: GarminActivity[] = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const dateMatch = (r[cols.date] ?? '').match(/\d{4}-\d{2}-\d{2}/)
    if (!dateMatch) continue
    const date = dateMatch[0]
    const type = mapType(r[cols.type] ?? '')
    const durationMin = cols.time >= 0 ? toMinutes(r[cols.time] ?? '') : 0
    const distanceKm = cols.distance >= 0 ? num(r[cols.distance]) : undefined
    const pace =
      type === 'running' && distanceKm && durationMin
        ? (() => {
            const p = durationMin / distanceKm
            return `${Math.floor(p)}:${String(Math.round((p % 1) * 60)).padStart(2, '0')}`
          })()
        : undefined
    activities.push({
      id: `csv-${date}-${i}`,
      date,
      type,
      name: (cols.title >= 0 && r[cols.title]) || r[cols.type] || 'Actividad Garmin',
      durationMin,
      distanceKm,
      paceMinKm: pace,
      avgHR: cols.hr >= 0 ? num(r[cols.hr]) : undefined,
      calories: (cols.calories >= 0 ? num(r[cols.calories]) : undefined) ?? 0,
    })
  }

  if (activities.length === 0) {
    return { ok: false, message: 'No encontré actividades válidas en el archivo.', activities: [] }
  }
  return { ok: true, message: `${activities.length} actividades importadas del CSV de Garmin.`, activities }
}
