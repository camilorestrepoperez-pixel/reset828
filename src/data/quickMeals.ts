// Comidas rápidas para días ocupados — un tap y queda registrado el combo completo.
// Sin espinaca, sin huevo duro.
import type { MealType, FavMealItem } from '../types'

export interface QuickMeal {
  id: string
  name: string
  meal: MealType
  items: FavMealItem[]
}

export const QUICK_MEALS: QuickMeal[] = [
  {
    id: 'q1', name: '⚡ Desayuno exprés: yogur + avena + banano', meal: 'desayuno',
    items: [
      { name: 'Yogur griego natural', qty: 1, kcal: 100, protein: 17, carbs: 6, fat: 0.7 },
      { name: 'Avena en hojuelas', qty: 1, kcal: 150, protein: 5, carbs: 27, fat: 3 },
      { name: 'Banano', qty: 1, kcal: 105, protein: 1.3, carbs: 27, fat: 0.4 },
    ],
  },
  {
    id: 'q2', name: '⚡ Desayuno clásico: arepa + pericos', meal: 'desayuno',
    items: [
      { name: 'Arepa blanca mediana', qty: 1, kcal: 170, protein: 3, carbs: 35, fat: 2 },
      { name: 'Huevos pericos (2 huevos)', qty: 1, kcal: 190, protein: 13, carbs: 4, fat: 14 },
    ],
  },
  {
    id: 'q3', name: '⚡ Almuerzo exprés: atún + arroz + aguacate', meal: 'almuerzo',
    items: [
      { name: 'Atún en agua (lata)', qty: 1, kcal: 135, protein: 30, carbs: 0, fat: 1.5 },
      { name: 'Arroz blanco cocido', qty: 1, kcal: 195, protein: 4, carbs: 42, fat: 0.4 },
      { name: 'Aguacate', qty: 1, kcal: 112, protein: 1.4, carbs: 6, fat: 10 },
    ],
  },
  {
    id: 'q4', name: '⚡ Almuerzo corporativo: pollo + arroz + ensalada', meal: 'almuerzo',
    items: [
      { name: 'Pechuga de pollo a la plancha', qty: 1, kcal: 248, protein: 46, carbs: 0, fat: 5.4 },
      { name: 'Arroz blanco cocido', qty: 1, kcal: 195, protein: 4, carbs: 42, fat: 0.4 },
      { name: 'Ensalada mixta', qty: 1, kcal: 30, protein: 1.5, carbs: 6, fat: 0.3 },
    ],
  },
  {
    id: 'q5', name: '⚡ Cena ligera: pollo + ensalada + aguacate', meal: 'cena',
    items: [
      { name: 'Pechuga de pollo a la plancha', qty: 1, kcal: 248, protein: 46, carbs: 0, fat: 5.4 },
      { name: 'Ensalada mixta', qty: 1, kcal: 30, protein: 1.5, carbs: 6, fat: 0.3 },
      { name: 'Aguacate', qty: 0.5, kcal: 56, protein: 0.7, carbs: 3, fat: 5 },
    ],
  },
  {
    id: 'q6', name: '⚡ Post-entreno: whey + banano', meal: 'snack',
    items: [
      { name: 'Whey protein', qty: 1, kcal: 120, protein: 24, carbs: 3, fat: 1.5 },
      { name: 'Banano', qty: 1, kcal: 105, protein: 1.3, carbs: 27, fat: 0.4 },
    ],
  },
]
