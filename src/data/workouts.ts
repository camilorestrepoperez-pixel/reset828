import type { WorkoutDay } from '../types'

// Estructura semanal: 3 fuerza · 1 funcional · 1 running · 1 cardio suave · 1 recuperación.
// Cada sesión cabe en máximo 75 minutos (calentamiento + principal + accesorios + cardio/core).
// Objetivo: perder grasa y fortalecer sin sobreentrenar.
export const WORKOUT_PLAN: WorkoutDay[] = [
  {
    key: 'lun', dayIndex: 0, title: 'Fuerza — Tren superior', focus: 'Gimnasio · ~70 min', color: '#b4f629',
    exercises: [
      { id: 'lun0', name: 'Calentamiento: cardio suave + movilidad de hombro', muscle: 'General', sets: 1, reps: '8 min', rest: '—', cue: '5 min de bici o caminadora + rotadores y pass-throughs con banda.', type: 'movilidad', block: 'calentamiento', estMin: 8 },
      { id: 'lun1', name: 'Press banca o press mancuernas', muscle: 'Pecho', sets: 4, reps: '8-10', rest: '90s', cue: 'Baja controlado, codos a 45°. No rebotes en el pecho.', type: 'fuerza', block: 'principal', estMin: 11 },
      { id: 'lun2', name: 'Remo con cable', muscle: 'Espalda', sets: 4, reps: '10-12', rest: '90s', cue: 'Pecho arriba, jala con los codos, aprieta escápulas.', type: 'fuerza', block: 'principal', estMin: 11 },
      { id: 'lun3', name: 'Press militar', muscle: 'Hombro', sets: 3, reps: '8-10', rest: '75s', cue: 'Core apretado, no arquees la espalda baja.', type: 'fuerza', block: 'accesorio', estMin: 8 },
      { id: 'lun4', name: 'Jalón al pecho', muscle: 'Espalda', sets: 3, reps: '10-12', rest: '75s', cue: 'Agarre ancho, lleva la barra a la clavícula.', type: 'fuerza', block: 'accesorio', estMin: 8 },
      { id: 'lun5a', name: 'Curl bíceps', muscle: 'Bíceps', sets: 3, reps: '12', rest: '0s (superserie)', cue: 'Codos pegados, sin balanceo. Pasa directo al tríceps.', type: 'fuerza', block: 'accesorio', estMin: 5, group: 'Superserie brazos' },
      { id: 'lun5b', name: 'Tríceps en polea', muscle: 'Tríceps', sets: 3, reps: '12', rest: '60s fin de ronda', cue: 'Extiende completo. Descansa al terminar cada ronda de la superserie.', type: 'fuerza', block: 'accesorio', estMin: 5, group: 'Superserie brazos' },
      { id: 'lun6', name: 'Caminata inclinada (opcional pero recomendada)', muscle: 'Cardio', sets: 1, reps: '15 min', rest: '—', cue: 'Inclinación 8-12%, ritmo que permita hablar. Quema extra sin fatigar.', type: 'cardio', block: 'cardio', estMin: 15 },
    ],
  },
  {
    key: 'mar', dayIndex: 1, title: 'Running — Intervalos', focus: 'Running · ~45 min', color: '#4ade80',
    exercises: [
      { id: 'mar0', name: 'Calentamiento: trote suave + movilidad de tobillo y cadera', muscle: 'General', sets: 1, reps: '10 min', rest: '—', cue: 'Ritmo cómodo, zancadas cortas, articulaciones despiertas.', type: 'cardio', block: 'calentamiento', estMin: 10 },
      { id: 'mar1', name: 'Intervalos 1 min rápido / 2 min suave', muscle: 'Cardio', sets: 6, reps: '1+2 min', rest: 'trote suave', cue: 'Rápido = 8/10 de esfuerzo. Suave = recuperas de verdad.', type: 'cardio', block: 'principal', estMin: 18 },
      { id: 'mar2', name: 'Enfriamiento: trote muy suave + caminar', muscle: 'Cardio', sets: 1, reps: '8 min', rest: '—', cue: 'Baja pulsaciones gradualmente.', type: 'cardio', block: 'cardio', estMin: 8 },
      { id: 'mar3', name: 'Estiramiento de piernas completo', muscle: 'Movilidad', sets: 1, reps: '8 min', rest: '—', cue: 'Femorales, cuádriceps, pantorrillas, flexores de cadera.', type: 'movilidad', block: 'movilidad', estMin: 8 },
    ],
  },
  {
    key: 'mie', dayIndex: 2, title: 'Fuerza — Tren inferior + core', focus: 'Gimnasio · ~65 min', color: '#b4f629',
    exercises: [
      { id: 'mie0', name: 'Calentamiento: bici suave + activación de glúteo', muscle: 'General', sets: 1, reps: '8 min', rest: '—', cue: '5 min bici + puentes de glúteo y sentadillas al aire.', type: 'movilidad', block: 'calentamiento', estMin: 8 },
      { id: 'mie1', name: 'Sentadilla con barra o goblet', muscle: 'Pierna', sets: 4, reps: '8-10', rest: '2 min', cue: 'Profundidad hasta paralelo, rodillas hacia afuera.', type: 'fuerza', block: 'principal', estMin: 13 },
      { id: 'mie2', name: 'Peso muerto rumano', muscle: 'Femoral/Glúteo', sets: 4, reps: '10', rest: '90s', cue: 'Espalda recta, cadera atrás, siente el estiramiento.', type: 'fuerza', block: 'principal', estMin: 11 },
      { id: 'mie3', name: 'Zancadas caminando', muscle: 'Pierna/Glúteo', sets: 3, reps: '12 por pierna', rest: '90s', cue: 'Torso vertical, rodilla no pasa la punta del pie.', type: 'fuerza', block: 'accesorio', estMin: 9 },
      { id: 'mie4', name: 'Elevación de talones', muscle: 'Pantorrilla', sets: 3, reps: '15', rest: '45s', cue: 'Pausa arriba 1 segundo.', type: 'fuerza', block: 'accesorio', estMin: 6 },
      { id: 'mie5a', name: 'Plancha', muscle: 'Core', sets: 3, reps: '45s', rest: '30s', cue: 'Glúteos apretados, no dejes caer la cadera.', type: 'fuerza', block: 'core', estMin: 5, group: 'Core' },
      { id: 'mie5b', name: 'Elevación de piernas', muscle: 'Core', sets: 3, reps: '10-12', rest: '45s', cue: 'Sin impulso, controla la bajada.', type: 'fuerza', block: 'core', estMin: 5, group: 'Core' },
    ],
  },
  {
    key: 'jue', dayIndex: 3, title: 'Funcional metabólico', focus: 'Circuito · ~45 min', color: '#fb923c',
    exercises: [
      { id: 'jue0', name: 'Calentamiento: saltar lazo o trote + movilidad general', muscle: 'General', sets: 1, reps: '6 min', rest: '—', cue: 'Sube pulsaciones gradual. Muñecas, hombros, cadera.', type: 'movilidad', block: 'calentamiento', estMin: 6 },
      { id: 'jue1a', name: 'Sentadilla peso corporal', muscle: 'Pierna', sets: 4, reps: '15', rest: 'sigue', cue: 'Ritmo constante, rango completo. Sin pausa entre ejercicios del circuito.', type: 'funcional', block: 'principal', estMin: 5, group: 'Circuito funcional · 4 rondas' },
      { id: 'jue1b', name: 'Push-ups', muscle: 'Pecho', sets: 4, reps: '10', rest: 'sigue', cue: 'Cuerpo en línea, pecho al piso.', type: 'funcional', block: 'principal', estMin: 4, group: 'Circuito funcional · 4 rondas' },
      { id: 'jue2a', name: 'Kettlebell swing', muscle: 'Cadena posterior', sets: 4, reps: '15', rest: 'sigue', cue: 'La fuerza sale de la cadera, no de los brazos.', type: 'funcional', block: 'principal', estMin: 4, group: 'Circuito funcional · 4 rondas' },
      { id: 'jue2b', name: 'Mountain climbers', muscle: 'Core/Cardio', sets: 4, reps: '30s', rest: 'sigue', cue: 'Cadera baja, rodillas al pecho rápido.', type: 'funcional', block: 'principal', estMin: 4, group: 'Circuito funcional · 4 rondas' },
      { id: 'jue3', name: 'Plancha', muscle: 'Core', sets: 4, reps: '45s', rest: '90s fin de ronda', cue: 'Cierra cada ronda con plancha y descansa 90s completos antes de la siguiente.', type: 'funcional', block: 'core', estMin: 8, group: 'Circuito funcional · 4 rondas' },
      { id: 'jue4', name: 'Movilidad de cadera y hombro', muscle: 'Movilidad', sets: 1, reps: '10 min', rest: '—', cue: '90/90, gato-camello, pass-throughs con banda.', type: 'movilidad', block: 'movilidad', estMin: 10 },
    ],
  },
  {
    key: 'vie', dayIndex: 4, title: 'Fuerza — Full body', focus: 'Gimnasio · ~70 min', color: '#b4f629',
    exercises: [
      { id: 'vie0', name: 'Calentamiento: remo o bici + movilidad general', muscle: 'General', sets: 1, reps: '8 min', rest: '—', cue: '5 min de máquina + sentadillas al aire y band pull-aparts.', type: 'movilidad', block: 'calentamiento', estMin: 8 },
      { id: 'vie1', name: 'Sentadilla frontal o prensa', muscle: 'Pierna', sets: 4, reps: '8', rest: '2 min', cue: 'Carga honesta: las últimas 2 reps deben costar.', type: 'fuerza', block: 'principal', estMin: 13 },
      { id: 'vie2', name: 'Press inclinado con mancuernas', muscle: 'Pecho', sets: 4, reps: '10', rest: '90s', cue: 'Banca a 30°, baja hasta sentir estiramiento.', type: 'fuerza', block: 'principal', estMin: 11 },
      { id: 'vie3', name: 'Remo con barra', muscle: 'Espalda', sets: 4, reps: '10', rest: '90s', cue: 'Torso a 45°, jala al ombligo.', type: 'fuerza', block: 'principal', estMin: 11 },
      { id: 'vie4', name: 'Hip thrust', muscle: 'Glúteo', sets: 3, reps: '12', rest: '75s', cue: 'Pausa 1s arriba, mentón al pecho.', type: 'fuerza', block: 'accesorio', estMin: 8 },
      { id: 'vie5', name: 'Farmer carry', muscle: 'Full body', sets: 3, reps: '30m', rest: '75s', cue: 'Mancuernas pesadas, hombros atrás, camina firme.', type: 'fuerza', block: 'accesorio', estMin: 7 },
      { id: 'vie6', name: 'Cardio suave opcional (bici o caminadora)', muscle: 'Cardio', sets: 1, reps: '10 min', rest: '—', cue: 'Solo si quedó gasolina. Zona 2, nada heroico.', type: 'cardio', block: 'cardio', estMin: 10 },
    ],
  },
  {
    key: 'sab', dayIndex: 5, title: 'Cardio suave — Running Z2 o caminata larga', focus: 'Zona 2 · ~60 min', color: '#4ade80',
    exercises: [
      { id: 'sab0', name: 'Calentamiento: caminar rápido', muscle: 'General', sets: 1, reps: '5 min', rest: '—', cue: 'Arranca caminando antes de trotar.', type: 'cardio', block: 'calentamiento', estMin: 5 },
      { id: 'sab1', name: 'Running suave zona 2 (o caminata rápida sostenida)', muscle: 'Cardio', sets: 1, reps: '40-50 min', rest: '—', cue: 'Debes poder hablar en frases completas. Si no, baja el ritmo. Esta sesión quema grasa sin robarle a la fuerza.', type: 'cardio', block: 'principal', estMin: 45 },
      { id: 'sab2', name: 'Estiramiento completo', muscle: 'Movilidad', sets: 1, reps: '10 min', rest: '—', cue: 'Femorales, cuádriceps, pantorrillas, cadera.', type: 'movilidad', block: 'movilidad', estMin: 10 },
    ],
  },
  {
    key: 'dom', dayIndex: 6, title: 'Descanso activo', focus: 'Recuperación · ~45 min', color: '#8b8b93',
    exercises: [
      { id: 'dom1', name: 'Caminata ligera', muscle: 'Recuperación', sets: 1, reps: '30 min', rest: '—', cue: 'Sin audífonos de trabajo. Camina y desconecta.', type: 'movilidad', block: 'principal', estMin: 30 },
      { id: 'dom2', name: 'Rutina de movilidad completa', muscle: 'Movilidad', sets: 1, reps: '15 min', rest: '—', cue: 'Cadera, columna, hombros. Prepara la semana.', type: 'movilidad', block: 'movilidad', estMin: 15 },
    ],
  },
]
