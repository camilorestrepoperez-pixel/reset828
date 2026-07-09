// FC en vivo vía Web Bluetooth (estándar Heart Rate Service 0x180D).
// Los relojes Garmin transmiten como sensor BLE activando en el reloj:
//   Configuración → Sensores → Transmitir frecuencia cardiaca.
// Requisitos: HTTPS (GitHub Pages ✓) y Chrome/Edge en Android o PC.
// iOS/Safari NO soporta Web Bluetooth — ahí no aparece el botón.

export const isSupported = () =>
  typeof navigator !== 'undefined' && 'bluetooth' in navigator

export interface HRConnection {
  ok: boolean
  message?: string
  deviceName?: string
  disconnect?: () => void
}

export async function connectHR(
  onBpm: (bpm: number) => void,
  onDisconnect: () => void,
): Promise<HRConnection> {
  if (!isSupported()) {
    return { ok: false, message: 'Este navegador no soporta Web Bluetooth. Usa Chrome en Android o PC.' }
  }
  try {
    const bt = (navigator as unknown as { bluetooth: any }).bluetooth
    const device = await bt.requestDevice({ filters: [{ services: ['heart_rate'] }] })
    const server = await device.gatt.connect()
    const service = await server.getPrimaryService('heart_rate')
    const char = await service.getCharacteristic('heart_rate_measurement')
    await char.startNotifications()
    char.addEventListener('characteristicvaluechanged', (e: any) => {
      const v: DataView = e.target.value
      const flags = v.getUint8(0)
      // bit 0 del flag: formato del valor (uint8 o uint16)
      const bpm = flags & 0x1 ? v.getUint16(1, true) : v.getUint8(1)
      onBpm(bpm)
    })
    device.addEventListener('gattserverdisconnected', onDisconnect)
    return {
      ok: true,
      deviceName: device.name ?? 'Sensor HR',
      disconnect: () => {
        try { device.gatt.disconnect() } catch { /* ya desconectado */ }
      },
    }
  } catch (e) {
    const msg = String(e)
    if (msg.includes('cancelled') || msg.includes('cancelled by the user') || msg.includes('chooser')) {
      return { ok: false, message: 'Selección cancelada.' }
    }
    return { ok: false, message: `No se pudo conectar: ${msg}` }
  }
}

/** Zona de frecuencia cardiaca por edad (fórmula 220 − edad) */
export function hrZone(bpm: number, age: number) {
  const max = 220 - age
  const pct = bpm / max
  if (pct < 0.6) return { z: 'Z1', label: 'Muy suave', color: '#38bdf8', pct }
  if (pct < 0.7) return { z: 'Z2', label: 'Quema grasa', color: '#4ade80', pct }
  if (pct < 0.8) return { z: 'Z3', label: 'Aeróbico', color: '#b4f629', pct }
  if (pct < 0.9) return { z: 'Z4', label: 'Umbral', color: '#fbbf24', pct }
  return { z: 'Z5', label: 'Máximo', color: '#ef4444', pct }
}
