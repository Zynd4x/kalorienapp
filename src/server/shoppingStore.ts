/// <reference types="node" />
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import {
  mkdir,
  open,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import type {
  SharedRoomState,
  ShoppingCategory,
  ShoppingItem,
} from '../types';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const MAX_ITEMS = 500;
const MAX_ADD_BATCH = 100;
const MAX_APPLIED_OPS = 800;
const MAX_ITEM_NAME = 80;
const MAX_ITEM_AMOUNT = 60;
const MAX_ID = 120;
const MIN_PASSWORD_LENGTH = 4;
const MAX_PASSWORD_LENGTH = 100;

const CATEGORIES: ShoppingCategory[] = [
  'Obst & Gemüse',
  'Molkerei & Eier',
  'Backwaren',
  'Fleisch & Fisch',
  'Vorrat',
  'Getränke',
  'Tiefkühl',
  'Sonstiges',
];

interface StoredRoom {
  code: string;
  passwordHash: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  items: ShoppingItem[];
  appliedOps: string[];
}

interface StoreFile {
  rooms: Record<string, StoredRoom>;
}

interface StoreMutation<T> {
  result: T;
  changed: boolean;
}

export interface ShoppingApiSuccess {
  ok: true;
  state: SharedRoomState;
}

export interface ShoppingApiFailure {
  ok: false;
  error: string;
  message: string;
  status: number;
}

export type ShoppingApiResponse = ShoppingApiSuccess | ShoppingApiFailure;

const DATA_DIR =
  process.env.SHOPPING_DATA_DIR?.trim() ||
  path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'shopping-rooms.json');
const LOCK_FILE = path.join(DATA_DIR, 'shopping-rooms.lock');
const LOCK_TIMEOUT_MS = 15000;
const LOCK_STALE_MS = 30000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireFileLock(): Promise<() => Promise<void>> {
  await mkdir(DATA_DIR, { recursive: true });
  const startedAt = Date.now();

  while (true) {
    try {
      const handle = await open(LOCK_FILE, 'wx');
      await handle.writeFile(`${process.pid}:${Date.now()}`, 'utf8');
      await handle.close();
      return async () => {
        try {
          await unlink(LOCK_FILE);
        } catch {
          // Die Sperre wurde bereits entfernt.
        }
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }

      try {
        const info = await stat(LOCK_FILE);
        if (Date.now() - info.mtimeMs > LOCK_STALE_MS) {
          try {
            await unlink(LOCK_FILE);
          } catch {
            // Ein anderer Prozess war schneller.
          }
          continue;
        }
      } catch {
        // Die Sperre wurde zwischenzeitlich freigegeben.
        continue;
      }

      if (Date.now() - startedAt > LOCK_TIMEOUT_MS) {
        // Notfall-Freigabe, damit die Anfrage nicht dauerhaft hängt.
        try {
          await unlink(LOCK_FILE);
        } catch {
          // Ignorieren und erneut versuchen.
        }
        continue;
      }

      await sleep(8 + Math.floor(Math.random() * 18));
    }
  }
}

async function withLock<T>(task: () => Promise<T>): Promise<T> {
  const release = await acquireFileLock();
  try {
    return await task();
  } finally {
    await release();
  }
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    if (parsed && parsed.rooms && typeof parsed.rooms === 'object') {
      return { rooms: parsed.rooms };
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      console.warn('[shoppingStore] Datendatei konnte nicht gelesen werden:', error);
    }
  }
  return { rooms: {} };
}

async function writeStore(data: StoreFile): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const payload = JSON.stringify(data);
  const tempFile = `${DATA_FILE}.${process.pid}.tmp`;
  await writeFile(tempFile, payload, 'utf8');
  try {
    await rename(tempFile, DATA_FILE);
  } catch {
    await writeFile(DATA_FILE, payload, 'utf8');
  }
}

async function mutate(
  task: (
    data: StoreFile,
  ) => StoreMutation<ShoppingApiResponse> | Promise<StoreMutation<ShoppingApiResponse>>,
): Promise<ShoppingApiResponse> {
  return withLock(async () => {
    const data = await readStore();
    const mutation = await task(data);
    if (mutation.changed) {
      await writeStore(data);
    }
    return mutation.result;
  });
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeRoom(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}

function normalizePassword(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return 'Das Passwort ist zu lang.';
  }
  return null;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  try {
    const expected = Buffer.from(hash, 'hex');
    const candidate = scryptSync(password, salt, expected.length);
    return (
      candidate.length === expected.length &&
      timingSafeEqual(candidate, expected)
    );
  } catch {
    return false;
  }
}

function generateRoomCode(rooms: Record<string, StoredRoom>): string {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const bytes = randomBytes(ROOM_CODE_LENGTH);
    let code = '';
    for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
      code += ROOM_CODE_ALPHABET[bytes[index] % ROOM_CODE_ALPHABET.length];
    }
    if (!rooms[code]) return code;
  }
  return randomBytes(5).toString('hex').toUpperCase();
}

function sanitizeItem(value: unknown): ShoppingItem | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const id = cleanText(raw.id, MAX_ID);
  const name = cleanText(raw.name, MAX_ITEM_NAME);
  if (!id || !name) return null;

  const rawCategory = raw.category;
  const category: ShoppingCategory = CATEGORIES.includes(
    rawCategory as ShoppingCategory,
  )
    ? (rawCategory as ShoppingCategory)
    : 'Sonstiges';

  const amount = cleanText(raw.amount, MAX_ITEM_AMOUNT);
  const recipeId = cleanText(raw.recipeId, MAX_ID);
  const createdAt =
    typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt)
      ? raw.createdAt
      : Date.now();

  return {
    id,
    name,
    category,
    checked: raw.checked === true,
    createdAt,
    ...(amount ? { amount } : {}),
    ...(recipeId ? { recipeId } : {}),
  };
}

function mergeItems(
  existing: ShoppingItem[],
  incoming: unknown[],
): { items: ShoppingItem[]; added: number } {
  const byId = new Map(existing.map((item) => [item.id, item]));
  let added = 0;

  for (const raw of incoming) {
    if (byId.size >= MAX_ITEMS) break;
    const item = sanitizeItem(raw);
    if (!item || byId.has(item.id)) continue;
    byId.set(item.id, item);
    added += 1;
  }

  return {
    items: added === 0 ? existing : Array.from(byId.values()),
    added,
  };
}

function toRoomState(room: StoredRoom): SharedRoomState {
  return {
    room: room.code,
    version: room.version,
    items: room.items,
    updatedAt: room.updatedAt,
  };
}

function touch(room: StoredRoom): void {
  room.version += 1;
  room.updatedAt = Date.now();
}

function markApplied(room: StoredRoom, opId: string): void {
  if (!opId) return;
  room.appliedOps.push(opId);
  if (room.appliedOps.length > MAX_APPLIED_OPS) {
    room.appliedOps.splice(0, room.appliedOps.length - MAX_APPLIED_OPS);
  }
}

function alreadyApplied(room: StoredRoom, opId: string): boolean {
  return room.appliedOps.includes(opId);
}

function success(state: SharedRoomState): ShoppingApiSuccess {
  return { ok: true, state };
}

function failure(
  error: string,
  message: string,
  status = 400,
): ShoppingApiFailure {
  return { ok: false, error, message, status };
}

function readOperationId(body: Record<string, unknown>): string {
  return cleanText(body.opId, 140);
}

function authenticate(
  data: StoreFile,
  roomCode: string,
  password: string,
): { room: StoredRoom } | ShoppingApiFailure {
  if (!roomCode) {
    return failure('BAD_REQUEST', 'Bitte gib einen Raumcode ein.');
  }
  if (!password) {
    return failure('BAD_REQUEST', 'Bitte gib das Passwort für den Raum ein.');
  }
  const room = data.rooms[roomCode];
  if (!room) {
    return failure(
      'ROOM_NOT_FOUND',
      'Diesen Raum gibt es nicht. Prüfe den Raumcode.',
      404,
    );
  }
  if (!verifyPassword(password, room.passwordHash)) {
    return failure(
      'WRONG_PASSWORD',
      'Das Passwort ist falsch. Bitte versuche es erneut.',
      403,
    );
  }
  return { room };
}

export async function handleShoppingOperation(
  input: unknown,
): Promise<ShoppingApiResponse> {
  if (!input || typeof input !== 'object') {
    return failure('BAD_REQUEST', 'Ungültige Anfrage.');
  }

  const body = input as Record<string, unknown>;
  const op = cleanText(body.op, 30);

  if (op === 'create') {
    const name = cleanText(body.name, 40);
    const password = normalizePassword(body.password);
    const problem = passwordProblem(password);
    if (!name) {
      return failure('BAD_REQUEST', 'Bitte gib deinen Namen ein.');
    }
    if (problem) {
      return failure('WEAK_PASSWORD', problem);
    }

    return mutate((data) => {
      const code = generateRoomCode(data.rooms);
      const now = Date.now();
      const merged = mergeItems(
        [],
        Array.isArray(body.items) ? body.items : [],
      );
      const room: StoredRoom = {
        code,
        passwordHash: hashPassword(password),
        createdAt: now,
        updatedAt: now,
        version: 1,
        items: merged.items,
        appliedOps: [],
      };
      data.rooms[code] = room;
      return { result: success(toRoomState(room)), changed: true };
    });
  }

  const roomCode = normalizeRoom(body.room);
  const password = normalizePassword(body.password);

  if (op === 'join' || op === 'sync') {
    return mutate((data) => {
      const auth = authenticate(data, roomCode, password);
      if ('ok' in auth) return { result: auth, changed: false };

      const { room } = auth;
      if (op === 'sync') {
        return { result: success(toRoomState(room)), changed: false };
      }

      const merged = mergeItems(
        room.items,
        Array.isArray(body.items) ? body.items : [],
      );
      if (merged.added > 0) {
        room.items = merged.items;
        touch(room);
      }
      return { result: success(toRoomState(room)), changed: merged.added > 0 };
    });
  }

  const opId = readOperationId(body);
  if (!opId) {
    return failure('BAD_REQUEST', 'Der Vorgang konnte nicht zugeordnet werden.');
  }

  return mutate((data) => {
    const auth = authenticate(data, roomCode, password);
    if ('ok' in auth) return { result: auth, changed: false };

    const { room } = auth;

    if (alreadyApplied(room, opId)) {
      return { result: success(toRoomState(room)), changed: false };
    }

    if (op === 'add' || op === 'addMany') {
      const incoming =
        op === 'add'
          ? [body.item]
          : Array.isArray(body.items)
            ? body.items.slice(0, MAX_ADD_BATCH)
            : [];
      const merged = mergeItems(room.items, incoming);
      if (merged.added > 0) {
        room.items = merged.items;
        touch(room);
      }
      markApplied(room, opId);
      return { result: success(toRoomState(room)), changed: true };
    }

    if (op === 'setChecked') {
      const itemId = cleanText(body.itemId, MAX_ID);
      const checked = body.checked === true;
      let changed = false;
      if (itemId) {
        room.items = room.items.map((item) => {
          if (item.id !== itemId || item.checked === checked) return item;
          changed = true;
          return { ...item, checked };
        });
      }
      if (changed) touch(room);
      markApplied(room, opId);
      return { result: success(toRoomState(room)), changed: true };
    }

    if (op === 'remove') {
      const itemId = cleanText(body.itemId, MAX_ID);
      const nextItems = itemId
        ? room.items.filter((item) => item.id !== itemId)
        : room.items;
      if (nextItems.length !== room.items.length) {
        room.items = nextItems;
        touch(room);
      }
      markApplied(room, opId);
      return { result: success(toRoomState(room)), changed: true };
    }

    if (op === 'clearCompleted') {
      const ids = new Set(
        (Array.isArray(body.itemIds) ? body.itemIds : [])
          .map((value) => cleanText(value, MAX_ID))
          .filter(Boolean),
      );
      if (ids.size > 0) {
        const nextItems = room.items.filter(
          (item) => !(ids.has(item.id) && item.checked),
        );
        if (nextItems.length !== room.items.length) {
          room.items = nextItems;
          touch(room);
        }
      }
      markApplied(room, opId);
      return { result: success(toRoomState(room)), changed: true };
    }

    return {
      result: failure('UNKNOWN_OP', 'Unbekannter Vorgang.'),
      changed: false,
    };
  });
}
