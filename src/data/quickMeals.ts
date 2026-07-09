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
  {
    id: 'q7', name: '⚡ Yogur griego + granola + banano', meal: 'desayuno',
    items: [
      { name: 'Yogur griego natural', qty: 1, kcal: 100, protein: 17, carbs: 6, fat: 0.7 },
      { name: 'Granola', qty: 1, kcal: 210, protein: 5, carbs: 32, fat: 7 },
      { name: 'Banano', qty: 1, kcal: 105, protein: 1.3, carbs: 27, fat: 0.4 },
    ],
  },
  {
    id: 'q8', name: '🥐 Café con leche + pandebono', meal: 'desayuno',
    items: [
      { name: 'Café con leche', qty: 1, kcal: 60, protein: 3, carbs: 5, fat: 3 },
      { name: 'Pandebono', qty: 1, kcal: 220, protein: 6, carbs: 25, fat: 10 },
    ],
  },
  {
    id: 'q9', name: '⚡ Pasta con pollo', meal: 'almuerzo',
    items: [
      { name: 'Pasta cocida', qty: 1.5, kcal: 330, protein: 12, carbs: 65, fat: 2 },
      { name: 'Pechuga de pollo a la plancha', qty: 1, kcal: 248, protein: 46, carbs: 0, fat: 5.4 },
    ],
  },
  {
    id: 'q10', name: '🍽 Corrientazo promedio', meal: 'almuerzo',
    items: [{ name: 'Corrientazo promedio', qty: 1, kcal: 800, protein: 35, carbs: 95, fat: 28 }],
  },
  {
    id: 'q11', name: '🍽 Almuerzo ejecutivo', meal: 'almuerzo',
    items: [{ name: 'Almuerzo ejecutivo (sopa + seco)', qty: 1, kcal: 900, protein: 40, carbs: 105, fat: 32 }],
  },
  {
    id: 'q12', name: '⚡ Pollo asado + papa', meal: 'almuerzo',
    items: [
      { name: 'Pollo asado', qty: 1, kcal: 430, protein: 45, carbs: 2, fat: 27 },
      { name: 'Papa cocida', qty: 1, kcal: 130, protein: 3, carbs: 30, fat: 0.2 },
    ],
  },
  {
    id: 'q13', name: '🥐 Granola bowl', meal: 'snack',
    items: [{ name: 'Granola con yogur', qty: 1, kcal: 240, protein: 9, carbs: 32, fat: 8 }],
  },
  {
    id: 'q14', name: '🍽 Sandwich de pollo', meal: 'cena',
    items: [{ name: 'Sandwich de pollo', qty: 1, kcal: 450, protein: 30, carbs: 45, fat: 15 }],
  },
  {
    id: 'q15', name: '🍽 Sushi roll', meal: 'cena',
    items: [{ name: 'Sushi roll', qty: 1, kcal: 350, protein: 12, carbs: 55, fat: 8 }],
  },
  {
    id: 'q16', name: '🍕 Pizza (2 porciones)', meal: 'cena',
    items: [{ name: 'Pizza', qty: 2, kcal: 570, protein: 24, carbs: 68, fat: 22 }],
  },
  {
    id: 'q17', name: '🍔 Hamburguesa sencilla', meal: 'cena',
    items: [{ name: 'Hamburguesa sencilla', qty: 1, kcal: 550, protein: 25, carbs: 40, fat: 30 }],
  },
  {
    id: 'q18', name: '🍺 Cerveza + empanada', meal: 'snack',
    items: [
      { name: 'Cerveza', qty: 1, kcal: 140, protein: 1, carbs: 11, fat: 0 },
      { name: 'Empanada', qty: 1, kcal: 300, protein: 8, carbs: 28, fat: 17 },
    ],
  },
  {
    id: 'q19', name: '🆘 Cena de rescate: pollo + vegetales', meal: 'cena',
    items: [
      { name: 'Pechuga de pollo a la plancha', qty: 1, kcal: 248, protein: 46, carbs: 0, fat: 5.4 },
      { name: 'Brócoli al vapor', qty: 1, kcal: 50, protein: 4, carbs: 10, fat: 0.6 },
    ],
  },
  {
    id: 'q20', name: '⚡ Whey con agua', meal: 'snack',
    items: [{ name: 'Whey protein', qty: 1, kcal: 120, protein: 24, carbs: 3, fat: 1.5 }],
  },
  {
    id: 'q21', name: '🍎 Fruta + queso', meal: 'snack',
    items: [
      { name: 'Manzana', qty: 1, kcal: 95, protein: 0.5, carbs: 25, fat: 0.3 },
      { name: 'Queso campesino', qty: 1, kcal: 125, protein: 9, carbs: 2, fat: 9 },
    ],
  },
  {
    id: 'q22', name: '🥜 Frutos secos medidos', meal: 'snack',
    items: [{ name: 'Almendras', qty: 1, kcal: 116, protein: 4, carbs: 4, fat: 10 }],
  },
]
