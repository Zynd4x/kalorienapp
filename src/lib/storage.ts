import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiaryEntry, Goals, Recipe, ShoppingItem } from '../types';

const STORAGE_KEY = '@kalorienkompass/state/v1';

export interface PersistedState {
  goals: Goals;
  entries: DiaryEntry[];
  shopping: ShoppingItem[];
  recipes: Recipe[];
  water: Record<string, number>;
}

export async function loadState(): Promise<Partial<PersistedState> | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<PersistedState>;
  } catch {
    return null;
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function clearState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
