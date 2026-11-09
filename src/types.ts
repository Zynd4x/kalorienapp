export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type MealKey = Meal;

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  salt?: number;
}

export interface Food {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  imageUrl?: string;
  per100: Macros;
  servingSize?: number;
  servingLabel?: string;
  source: 'off' | 'local';
  categories?: string[];
}

export interface DiaryEntry {
  id: string;
  date: string;
  meal: Meal;
  food: Food;
  grams: number;
  createdAt: number;
}

export type ShoppingCategory =
  | 'Obst & Gemüse'
  | 'Molkerei & Eier'
  | 'Backwaren'
  | 'Fleisch & Fisch'
  | 'Vorrat'
  | 'Getränke'
  | 'Tiefkühl'
  | 'Sonstiges';

export interface ShoppingItem {
  id: string;
  name: string;
  amount?: string;
  category: ShoppingCategory;
  checked: boolean;
  recipeId?: string;
  createdAt: number;
}

export interface SharedConnection {
  room: string;
  password: string;
  name: string;
}

export type SharedStatus =
  | 'disconnected'
  | 'connecting'
  | 'online'
  | 'offline'
  | 'error';

export interface SharedRoomState {
  room: string;
  version: number;
  items: ShoppingItem[];
  updatedAt: number;
}

export interface SharedActionResult {
  ok: boolean;
  message?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  category: ShoppingCategory;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  emoji: string;
  servings: number;
  minutes: number;
  tags: string[];
  ingredients: Ingredient[];
  steps: string[];
  kcalPerServing?: number;
  isCustom?: boolean;
  createdAt: number;
}

export interface Goals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type StoreId =
  | 'aldi'
  | 'edeka'
  | 'rewe'
  | 'lidl'
  | 'penny'
  | 'netto'
  | 'kaufland';

export interface Store {
  id: StoreId;
  name: string;
  color: string;
  light: string;
  url: string;
}

export type BarcodeType = 'auto' | 'code128' | 'ean13';

export interface LoyaltyCard {
  id: string;
  storeId: StoreId;
  label: string;
  number: string;
  barcodeType: BarcodeType;
  note?: string;
  createdAt: number;
}

export type CouponStatus = 'available' | 'activated' | 'redeemed';

export interface StoreCoupon {
  id: string;
  cardId: string;
  title: string;
  description?: string;
  validUntil?: string;
  status: CouponStatus;
  createdAt: number;
}
