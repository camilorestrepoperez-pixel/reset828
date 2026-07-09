# RESET 828

Coach personal de recomposición corporal. **88 → 78 kg.** Entrenamiento, nutrición, mercado, check-in diario, progreso y wearables (Garmin, Strava, Apple Health) — todo en una sola app.

## Conexiones (wearables)

- **Garmin** — Health API (pasos, sueño, estrés, Body Battery, FC), Activity API (actividades) y Training API (enviar entreno del día o plan semanal al calendario de Garmin Connect). OAuth2 + PKCE preparado en `src/services/garmin/`; el intercambio de tokens requiere un proxy backend (`VITE_GARMIN_TOKEN_PROXY`) porque el client secret nunca va en el navegador. Sin credenciales → modo demo completo.
- **Strava** — importa actividades realizadas (running, caminata, cycling, fuerza) vía API v3. `VITE_STRAVA_CLIENT_ID/SECRET/REDIRECT_URI`. Modo demo disponible.
- **Apple Health** — capa preparada (`src/services/appleHealth/`): HealthKit NO es accesible desde web pura; la conexión real llega al empaquetar como iOS nativa (Capacitor). Modo demo + registro manual mientras tanto.
- **Fuente unificada** (`src/services/unifiedActivityService.ts` + `healthDataMapper.ts`) — consolida sin duplicados. Prioridad: Garmin para salud/recuperación, Strava para actividades, Apple para pasos diarios, manual como respaldo. Alimenta el dashboard, "Plan vs realizado" y las actividades recientes de Progreso.

## Correr localmente

```bash
cd C:\Users\LENOVO\Projects\reset-78
npm install
npm run dev
```

Abre **http://localhost:5173**. Para usarla desde el celular en la misma red WiFi: `npm run dev -- --host` y entra a la IP que muestra Vite.

Build de producción: `npm run build` (queda en `dist/`, se puede servir estático donde sea).

## Stack

- **Vite + React 18 + TypeScript** — SPA rápida, sin backend.
- **Tailwind CSS 4** — dark mode premium, acento verde ácido.
- **Zustand + persist** — todo el estado se guarda en `localStorage` del navegador. Cero configuración, funciona offline.
- **Recharts** — gráfica de peso.

> ⚠️ Los datos viven en el navegador donde uses la app. Si la usas en celular y computador, cada uno lleva su propio registro (v2: sincronización con Supabase).

## Pantallas

| Ruta | Qué hace |
|------|----------|
| `/` | Dashboard: "Hoy toca", recuperación, peso vs meta, macros, mini calendario semanal, pasos/sueño (Garmin), agua, racha, insights |
| `/calendario` | Vista mensual/semanal con estado por día (cumplido/parcial/fallado), detalle al clic, mover entrenos, accesos rápidos |
| `/garmin` | Integración Garmin: modo demo funcional hoy, arquitectura OAuth2 lista para conexión real (`src/services/garmin/`) |
| `/perfil` | Perfil físico completo + cálculo en vivo de calorías y macros (Mifflin-St Jeor, déficit 20%) |
| `/plan` | Semana completa: entrenos + plan de comidas sugerido por día |
| `/entreno` | Rutina del día: checkboxes, series/peso/reps, RPE, notas, cardio, progresión sugerida, editar/agregar ejercicios |
| `/nutricion` | Registro de comidas por bloque, búsqueda de 30 alimentos colombianos, alimentos propios, repetir día anterior |
| `/recetas` | 12 recetas (sin espinaca, sin huevo duro) con macros, pasos, y botones "al día" / "al mercado" |
| `/mercado` | Lista semanal por categorías, marcar comprado, copiar para WhatsApp, 3/5/7 días |
| `/checkin` | Check-in diario: peso, sueño, energía, hambre, estrés, cumplimiento, pasos, nota → insights inmediatos |
| `/progreso` | Curva de peso, resumen 4 semanas, progresión de cargas, badges, medidas corporales |

## Lógica del coach (reglas, sin IA... por ahora)

- **Calorías:** Mifflin-St Jeor × factor de actividad − 20% de déficit (piso 1700 kcal). Proteína 2 g/kg de peso meta, grasa 0.9 g/kg, resto carbos.
- **Progresión:** completaste todo con RPE ≤ 8 → sube 2.5 kg. Sesión incompleta o RPE ≥ 9.5 → mantén o baja volumen.
- **Alertas:** pérdida > 1.2 kg/semana → frena. Peso plano 2 semanas → −150 kcal o +2000 pasos. 3+ días sin entrenar → reset suave. Sueño < 6h → baja intensidad hoy.
- **Racha:** cuenta días consecutivos con ≥2 de 3 cumplimientos (entreno, comida, agua).

La interfaz `CoachAdapter` en `src/lib/ai.ts` es el punto único para conectar una API de IA real después (generar rutinas, ajustar calorías, crear recetas) sin tocar las pantallas.

**Motor entreno ↔ nutrición** (`src/lib/mealCoach.ts` + `src/data/menu78.ts`): menú curado de 35 comidas numeradas con mapeo explícito por tipo de día (fuerza / **pierna** / running / funcional / descanso — pierna se detecta por los músculos del bloque principal y permite más carbohidrato; running incluye pre-running y post-running). Ajustes en vivo: proteína atrasada → snack + cena altos en proteína; pasado de calorías → cena de rescate (#18/19/22); rutina en modo rápida → comidas de <15 min; hambre alta (check-in ≥8) → volumen + proteína; entrenó fuerte (RPE ≥9) → post-entreno completo. Sugerencias en Dashboard (menú del día completo), Calendario, Entreno, Nutrición (con botón añadir) y Plan semanal (mercado automático). Recetas: 60 en total (25 originales + menú de 35) con filtros por categoría, tipo de día, proteína, calorías y tiempo. Rutinas por bloques ≤75 min.

## Estructura

```
src/
  components/   Layout (nav) + ui.tsx (Card, Button, Modal, Scale, Toggle...)
  data/         foods.ts (30 alimentos CO), recipes.ts (12), workouts.ts, grocery.ts, quickMeals.ts
  lib/          calc.ts (TDEE, macros, progresión, insights, rachas) · calendar.ts (estado por día)
                weekReport.ts (lectura del coach) · ai.ts (adaptador coach)
  services/
    garmin/     garminAuthService (OAuth2, env vars) · garminSyncService · garminMockData
                garminActivityMapper · garminHealthMapper (recuperación)
  pages/        una por pantalla
  store/        useStore.ts (Zustand + persist)
  types.ts      todos los tipos
```

## Garmin

Hoy funciona en **modo demo** (datos simulados deterministas). Para la conexión real:
1. Credenciales del [Garmin Connect Developer Program](https://developer.garmin.com/).
2. Archivo `.env` con `VITE_GARMIN_CLIENT_ID`, `VITE_GARMIN_CLIENT_SECRET`, `VITE_GARMIN_REDIRECT_URI`.
3. Un backend mínimo para el intercambio de tokens (el client secret nunca va en el navegador).
Sin nada de eso configurado, la app funciona normal — Garmin simplemente aparece "Sin conexión".

## Backup

Perfil → Copia de seguridad: exporta/importa todos los datos como JSON. Úsalo para respaldar o migrar de dispositivo.

## Ideas para v2

1. **Sincronización** — Supabase (auth + Postgres) para compartir datos entre celular y PC.
2. **Fotos de progreso** — captura mensual con comparador lado a lado.
3. **IA real** — conectar `CoachAdapter` a Claude API: rutinas nuevas, ajuste de calorías, recetas generadas.
4. **PWA** — instalable en el home screen con notificación de check-in a las 9 pm.
5. **Importar datos** — pasos desde Google Fit / Apple Health, peso desde báscula inteligente.
6. **Deload automático** — cada 4ª semana bajar volumen 40%.
