import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { SharedRoomState, ShoppingItem } from '../types';

export interface ShoppingRequestBase {
  room: string;
  password: string;
}

export type ShoppingOperationPayload =
  | {
      op: 'create';
      name: string;
      password: string;
      items: ShoppingItem[];
    }
  | {
      op: 'join';
      name: string;
      room: string;
      password: string;
      items: ShoppingItem[];
    }
  | ({ op: 'sync' } & ShoppingRequestBase)
  | ({ op: 'add'; opId: string; item: ShoppingItem } & ShoppingRequestBase)
  | ({ op: 'addMany'; opId: string; items: ShoppingItem[] } & ShoppingRequestBase)
  | ({
      op: 'setChecked';
      opId: string;
      itemId: string;
      checked: boolean;
    } & ShoppingRequestBase)
  | ({ op: 'remove'; opId: string; itemId: string } & ShoppingRequestBase)
  | ({
      op: 'clearCompleted';
      opId: string;
      itemIds: string[];
    } & ShoppingRequestBase);

export type ShoppingMutation =
  | { op: 'add'; opId: string; item: ShoppingItem }
  | { op: 'addMany'; opId: string; items: ShoppingItem[] }
  | { op: 'setChecked'; opId: string; itemId: string; checked: boolean }
  | { op: 'remove'; opId: string; itemId: string }
  | { op: 'clearCompleted'; opId: string; itemIds: string[] };

export interface ShoppingResponse {
  ok: boolean;
  state?: SharedRoomState;
  error?: string;
  message?: string;
}

export function withConnection(
  mutation: ShoppingMutation,
  room: string,
  password: string,
): ShoppingOperationPayload {
  switch (mutation.op) {
    case 'add':
      return {
        op: 'add',
        opId: mutation.opId,
        item: mutation.item,
        room,
        password,
      };
    case 'addMany':
      return {
        op: 'addMany',
        opId: mutation.opId,
        items: mutation.items,
        room,
        password,
      };
    case 'setChecked':
      return {
        op: 'setChecked',
        opId: mutation.opId,
        itemId: mutation.itemId,
        checked: mutation.checked,
        room,
        password,
      };
    case 'remove':
      return {
        op: 'remove',
        opId: mutation.opId,
        itemId: mutation.itemId,
        room,
        password,
      };
    case 'clearCompleted':
      return {
        op: 'clearCompleted',
        opId: mutation.opId,
        itemIds: mutation.itemIds,
        room,
        password,
      };
  }
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function baseUrlFromHostUri(hostUri: string): string | null {
  const cleaned = hostUri.trim().replace(/^[a-z]+:\/\//i, '');
  const host = cleaned.split('/')[0];
  if (!host) return null;
  const isTunnel =
    host.includes('.exp.direct') ||
    host.includes('.exp.host') ||
    host.includes('.ngrok');
  return `${isTunnel ? 'https' : 'http'}://${host}`;
}

/**
 * Ermittelt die Adresse des Dev-Servers. Im Tunnel-Modus ist das die
 * öffentliche *.exp.direct-Adresse, im LAN-Modus die lokale IP.
 * Für einen deployten Server kann EXPO_PUBLIC_SYNC_URL gesetzt werden.
 */
export function getSyncBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_SYNC_URL?.trim();
  if (configured) return stripTrailingSlash(configured);

  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    window.location?.origin
  ) {
    return stripTrailingSlash(window.location.origin);
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const fromHost = baseUrlFromHostUri(hostUri);
    if (fromHost) return fromHost;
  }

  const linkingUri = Constants.linkingUri;
  if (linkingUri) {
    const fromLinking = baseUrlFromHostUri(linkingUri);
    if (fromLinking) return fromLinking;
  }

  return '';
}

export async function sendShoppingRequest(
  payload: ShoppingOperationPayload,
  timeoutMs = 12000,
): Promise<ShoppingResponse> {
  const baseUrl = getSyncBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: 'NO_SERVER',
      message:
        'Der Synchronisierungs-Server wurde nicht gefunden. Starte die App mit "npm start" neu.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/api/shopping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text();
    let data: ShoppingResponse | null = null;
    try {
      data = text ? (JSON.parse(text) as ShoppingResponse) : null;
    } catch {
      data = null;
    }

    if (!data || typeof data.ok !== 'boolean') {
      return {
        ok: false,
        error: 'BAD_RESPONSE',
        message: 'Der Server hat unerwartet geantwortet.',
      };
    }

    if (!response.ok || !data.ok) {
      return {
        ok: false,
        error: data.error ?? 'HTTP_ERROR',
        message:
          data.message ?? `Synchronisierung fehlgeschlagen (${response.status}).`,
      };
    }

    return data;
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === 'AbortError' || error.name === 'TimeoutError');
    return {
      ok: false,
      error: timedOut ? 'TIMEOUT' : 'NETWORK',
      message: timedOut
        ? 'Der Server antwortet gerade nicht. Die App versucht es weiter.'
        : 'Keine Verbindung zum Server. Die App versucht es weiter.',
    };
  } finally {
    clearTimeout(timeout);
  }
}
