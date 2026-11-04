import type { Macros } from '../types';

export function round(value: number, digits = 1): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function formatNumber(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(digits).replace('.', ',');
}

export function formatPrice(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} €`;
}

export function scaleMacros(per100: Macros, grams: number): Macros {
  const factor = Math.max(0, grams) / 100;
  return {
    kcal: Math.round(per100.kcal * factor),
    protein: round(per100.protein * factor, 1),
    carbs: round(per100.carbs * factor, 1),
    fat: round(per100.fat * factor, 1),
    fiber:
      per100.fiber === undefined ? undefined : round(per100.fiber * factor, 1),
    sugar:
      per100.sugar === undefined ? undefined : round(per100.sugar * factor, 1),
    salt:
      per100.salt === undefined ? undefined : round(per100.salt * factor, 2),
  };
}

export function sumMacros(items: Macros[]): Macros {
  return items.reduce<Macros>(
    (total, item) => ({
      kcal: total.kcal + item.kcal,
      protein: round(total.protein + item.protein, 1),
      carbs: round(total.carbs + item.carbs, 1),
      fat: round(total.fat + item.fat, 1),
      fiber: round((total.fiber ?? 0) + (item.fiber ?? 0), 1),
      sugar: round((total.sugar ?? 0) + (item.sugar ?? 0), 1),
      salt: round((total.salt ?? 0) + (item.salt ?? 0), 2),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, salt: 0 },
  );
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function progress(value: number, goal: number): number {
  if (!goal || goal <= 0) return 0;
  return clamp(value / goal, 0, 1);
}

export function scaleAmount(amount: string, factor: number): string {
  const match = amount.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) return amount;
  const value = Number(match[1].replace(',', '.')) * factor;
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace('.', ',');
  return `${text} ${match[2]}`.trim();
}

export function foodEmoji(name: string): string {
  const value = name.toLowerCase();
  if (/(apfel|banane|beere|erdbeer|obst|traube|orange|zitrone|avocado)/.test(value))
    return '🍎';
  if (/(salat|tomate|gurke|brokkoli|gemüse|karotte|paprika|zwiebel)/.test(value))
    return '🥦';
  if (/(milch|joghurt|quark|käse|butter|sahne|ei)/.test(value)) return '🥛';
  if (/(brot|brötchen|toast|mehl|nudel|reis|pasta)/.test(value)) return '🍞';
  if (/(hähnchen|huhn|fleisch|hack|steak|wurst|schinken)/.test(value)) return '🍗';
  if (/(lachs|fisch|thunfisch|garnele)/.test(value)) return '🐟';
  if (/(kaffee|tee|wasser|saft|cola|getränk)/.test(value)) return '🥤';
  if (/(schokolade|keks|kuchen|süß|honig|eis)/.test(value)) return '🍫';
  if (/(protein|whey|shake)/.test(value)) return '💪';
  if (/(pizza|burger|pommes)/.test(value)) return '🍕';
  return '🥗';
}
