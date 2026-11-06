import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'kalorienkompass.syncServerUrl';

let cached: string | null = null;

/**
 * Ergänzt ein fehlendes Schema und entfernt abschließende Schrägstriche.
 * Leere Eingaben werden zu einem leeren String.
 */
export function normalizeSyncServerUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;
  return withScheme.replace(/\/+$/, '');
}

/**
 * Lädt die in der App gespeicherte Server-Adresse. Das Ergebnis wird im
 * Speicher gehalten, damit getSyncBaseUrl() synchron bleibt.
 */
export async function loadSyncServerUrl(): Promise<string> {
  if (cached !== null) return cached;
  try {
    cached = (await AsyncStorage.getItem(STORAGE_KEY)) ?? '';
  } catch {
    cached = '';
  }
  return cached;
}

/** Synchroner Zugriff auf die zuletzt geladene bzw. gespeicherte Adresse. */
export function getSyncServerUrl(): string {
  return cached ?? '';
}

/** Speichert die Adresse dauerhaft und aktualisiert den Zwischenspeicher. */
export async function saveSyncServerUrl(value: string): Promise<string> {
  const normalized = normalizeSyncServerUrl(value);
  cached = normalized;
  try {
    if (normalized) {
      await AsyncStorage.setItem(STORAGE_KEY, normalized);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ohne Persistenz funktioniert die App weiterhin, die Adresse gilt dann
    // nur für die laufende Sitzung.
  }
  return normalized;
}
