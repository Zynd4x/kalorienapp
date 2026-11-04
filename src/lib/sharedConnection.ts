import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { SharedConnection } from '../types';

const ASYNC_KEY = '@kalorienkompass/shared-connection/v1';
const SECURE_KEY = 'kalorienkompass_shared_connection_v1';

export async function saveSharedConnection(
  connection: SharedConnection,
): Promise<void> {
  const value = JSON.stringify(connection);

  if (Platform.OS !== 'web') {
    try {
      await SecureStore.setItemAsync(SECURE_KEY, value);
      return;
    } catch {
      // Fallback: Auf manchen Geräten ist SecureStore nicht verfügbar.
    }
  }

  try {
    await AsyncStorage.setItem(ASYNC_KEY, value);
  } catch {
    // Ohne Persistenz funktioniert die Verbindung bis zum nächsten App-Start.
  }
}

export async function loadSharedConnection(): Promise<SharedConnection | null> {
  let raw: string | null = null;

  if (Platform.OS !== 'web') {
    try {
      raw = await SecureStore.getItemAsync(SECURE_KEY);
    } catch {
      raw = null;
    }
  }

  if (!raw) {
    try {
      raw = await AsyncStorage.getItem(ASYNC_KEY);
    } catch {
      raw = null;
    }
  }

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SharedConnection>;
    if (
      !parsed ||
      typeof parsed.room !== 'string' ||
      typeof parsed.password !== 'string' ||
      !parsed.room ||
      !parsed.password
    ) {
      return null;
    }
    return {
      room: parsed.room,
      password: parsed.password,
      name: typeof parsed.name === 'string' ? parsed.name : '',
    };
  } catch {
    return null;
  }
}

export async function clearSharedConnection(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ASYNC_KEY);
  } catch {
    // Ignorieren: Es gibt dann nichts zu löschen.
  }

  if (Platform.OS !== 'web') {
    try {
      await SecureStore.deleteItemAsync(SECURE_KEY);
    } catch {
      // Ignorieren: Der Eintrag existiert möglicherweise nicht.
    }
  }
}
