/// <reference types="node" />
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { MongoClient, type Collection } from 'mongodb';
import type { SharedRoomState, ShoppingCategory, ShoppingItem } from '../types';

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

const DB_NAME = 'kalorienkompass';
const COLLECTION_NAME = 'rooms';

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
  _id: string;
  code: string;
  passwordHash: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  items: ShoppingItem[];
  appliedOps: string[];
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

let clientPromise: Promise<MongoClient> | null = null;
let roomsPromise: Promise<Collection<StoredRoom>> | null = null;

function mongoUri(): string {
  const configured = process.env.MONGODB_URI?.trim();
  if (configured) return configured;
  // Im Betrieb niemals stillschweigend auf localhost zeigen: Dort laeuft auf
  // einem Hosting-Server keine Datenbank, der Fehler waere sonst unklar.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('MONGODB_URI_MISSING');
  }
  return 'mongodb://127.0.0.1:27017';
}

function resetConnection(): void {
  clientPromise = null;
  roomsPromise = null;
}

async function getRooms(): Promise<Collection<StoredRoom>> {
  if (!roomsPromise) {
    roomsPromise = (async () => {
      if (!clientPromise) {
        clientPromise = MongoClient.connect(mongoUri(), {
          serverSelectionTimeoutMS: 8000,
          connectTimeoutMS: 8000,
          socketTimeoutMS: 20000,
          maxPoolSize: 10,
          appName: 'kalorienkompass-sync',
        });
      }
      const client = await clientPromise;
      return client.db(DB_NAME).collection<StoredRoom>(COLLECTION_NAME);
    })().catch((error: unknown) => {
      // Der naechste Aufruf darf einen neuen Verbindungsversuch starten.
      resetConnection();
      throw error;
    });
  }
  return roomsPromise;
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

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

async function generateRoomCode(
  rooms: Collection<StoredRoom>,
): Promise<string> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const bytes = randomBytes(ROOM_CODE_LENGTH);
    let code = '';
    for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
      code += ROOM_CODE_ALPHABET[bytes[index] % ROOM_CODE_ALPHABET.length];
    }
    const existing = await rooms.findOne(
      { _id: code },
      { projection: { _id: 1 } },
    );
    if (!existing) return code;
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

function sanitizeItems(value: unknown[]): ShoppingItem[] {
  const items: ShoppingItem[] = [];
  const seen = new Set<string>();

  for (const raw of value.slice(0, MAX_ADD_BATCH)) {
    const item = sanitizeItem(raw);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }

  return items;
}

function toRoomState(room: StoredRoom): SharedRoomState {
  return {
    room: room.code,
    version: room.version,
    items: room.items ?? [],
    updatedAt: room.updatedAt,
  };
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

function roomNotFound(): ShoppingApiFailure {
  return failure(
    'ROOM_NOT_FOUND',
    'Diesen Raum gibt es nicht. Prüfe den Raumcode.',
    404,
  );
}

function readOperationId(body: Record<string, unknown>): string {
  return cleanText(body.opId, 140);
}

async function authenticate(
  rooms: Collection<StoredRoom>,
  roomCode: string,
  password: string,
): Promise<{ room: StoredRoom } | ShoppingApiFailure> {
  if (!roomCode) {
    return failure('BAD_REQUEST', 'Bitte gib einen Raumcode ein.');
  }
  if (!password) {
    return failure('BAD_REQUEST', 'Bitte gib das Passwort für den Raum ein.');
  }
  const room = await rooms.findOne({ _id: roomCode });
  if (!room) {
    return roomNotFound();
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

/**
 * Haelt die Liste der bereits angewendeten Vorgaenge kurz. Wichtig fuer die
 * Idempotenz: Schickt ein Geraet denselben Vorgang zweimal (z. B. nach einem
 * Verbindungsabbruch), wird er nur einmal angewendet.
 */
function appliedOpsPush(opId: string) {
  return { $each: [opId], $slice: -MAX_APPLIED_OPS };
}

async function currentState(
  rooms: Collection<StoredRoom>,
  roomCode: string,
): Promise<ShoppingApiResponse> {
  const room = await rooms.findOne({ _id: roomCode });
  if (!room) return roomNotFound();
  return success(toRoomState(room));
}

/**
 * Fuegt Artikel hinzu. Jeder Artikel wird in genau einer atomaren Operation
 * geschrieben und nur dann, wenn er noch nicht existiert. Dadurch koennen
 * beliebig viele Geraete gleichzeitig schreiben, ohne dass Eintraege verloren
 * gehen oder doppelt auftauchen.
 */
async function addItems(
  rooms: Collection<StoredRoom>,
  roomCode: string,
  opId: string | null,
  items: ShoppingItem[],
): Promise<void> {
  for (const item of items) {
    const update: Record<string, unknown> = {
      $push: {
        items: { $each: [item], $slice: -MAX_ITEMS },
      },
      $inc: { version: 1 },
      $set: { updatedAt: Date.now() },
    };

    if (opId) {
      (update.$push as Record<string, unknown>).appliedOps = appliedOpsPush(opId);
    }

    await rooms.updateOne(
      { _id: roomCode, 'items.id': { $ne: item.id } },
      update,
    );
  }
}

async function createRoom(
  body: Record<string, unknown>,
): Promise<ShoppingApiResponse> {
  const name = cleanText(body.name, 40);
  const password = normalizePassword(body.password);
  const problem = passwordProblem(password);
  if (!name) {
    return failure('BAD_REQUEST', 'Bitte gib deinen Namen ein.');
  }
  if (problem) {
    return failure('WEAK_PASSWORD', problem);
  }

  const rooms = await getRooms();
  const items = sanitizeItems(Array.isArray(body.items) ? body.items : []);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = await generateRoomCode(rooms);
    const now = Date.now();
    const room: StoredRoom = {
      _id: code,
      code,
      passwordHash: hashPassword(password),
      createdAt: now,
      updatedAt: now,
      version: 1,
      items: items.slice(0, MAX_ITEMS),
      appliedOps: [],
    };

    try {
      await rooms.insertOne(room);
      return success(toRoomState(room));
    } catch (error) {
      // Sehr selten: Zwei Geraete erzeugen gleichzeitig denselben Code.
      if (!isDuplicateKey(error)) throw error;
    }
  }

  return failure(
    'CONFLICT',
    'Es konnte kein freier Raumcode erzeugt werden. Bitte versuche es erneut.',
    409,
  );
}

async function runOperation(input: unknown): Promise<ShoppingApiResponse> {
  if (!input || typeof input !== 'object') {
    return failure('BAD_REQUEST', 'Ungültige Anfrage.');
  }

  const body = input as Record<string, unknown>;
  const op = cleanText(body.op, 30);

  if (op === 'create') {
    return createRoom(body);
  }

  const roomCode = normalizeRoom(body.room);
  const password = normalizePassword(body.password);

  const rooms = await getRooms();
  const auth = await authenticate(rooms, roomCode, password);
  if ('ok' in auth) {
    return auth;
  }
  const code = auth.room.code;

  if (op === 'sync') {
    return currentState(rooms, code);
  }

  if (op === 'join') {
    const incoming = sanitizeItems(
      Array.isArray(body.items) ? body.items : [],
    );
    await addItems(rooms, code, null, incoming);
    return currentState(rooms, code);
  }

  const opId = readOperationId(body);
  if (!opId) {
    return failure('BAD_REQUEST', 'Der Vorgang konnte nicht zugeordnet werden.');
  }

  // Bereits angewendet? Dann nur den aktuellen Stand liefern.
  if ((auth.room.appliedOps ?? []).includes(opId)) {
    return success(toRoomState(auth.room));
  }

  if (op === 'add' || op === 'addMany') {
    const incoming =
      op === 'add' ? [body.item] : (body.items as unknown[] | undefined) ?? [];
    await addItems(rooms, code, opId, sanitizeItems(incoming));
    return currentState(rooms, code);
  }

  if (op === 'setChecked') {
    const itemId = cleanText(body.itemId, MAX_ID);
    const checked = body.checked === true;

    await rooms.updateOne(
      {
        _id: code,
        items: { $elemMatch: { id: itemId, checked: { $ne: checked } } },
      },
      {
        $set: { 'items.$.checked': checked, updatedAt: Date.now() },
        $inc: { version: 1 },
        $push: { appliedOps: appliedOpsPush(opId) },
      },
    );

    return currentState(rooms, code);
  }

  if (op === 'remove') {
    const itemId = cleanText(body.itemId, MAX_ID);

    if (itemId) {
      await rooms.updateOne(
        { _id: code, 'items.id': itemId },
        {
          $pull: { items: { id: itemId } },
          $inc: { version: 1 },
          $set: { updatedAt: Date.now() },
          $push: { appliedOps: appliedOpsPush(opId) },
        },
      );
    }

    return currentState(rooms, code);
  }

  if (op === 'clearCompleted') {
    const ids = Array.from(
      new Set(
        (Array.isArray(body.itemIds) ? body.itemIds : [])
          .map((value) => cleanText(value, MAX_ID))
          .filter(Boolean),
      ),
    );

    if (ids.length > 0) {
      await rooms.updateOne(
        {
          _id: code,
          items: { $elemMatch: { id: { $in: ids }, checked: true } },
        },
        {
          // $in ist fuer den typisierten PullOperator nicht vorgesehen,
          // MongoDB unterstuetzt es aber.
          $pull: {
            items: { id: { $in: ids }, checked: true },
          } as unknown as { id: string },
          $inc: { version: 1 },
          $set: { updatedAt: Date.now() },
          $push: { appliedOps: appliedOpsPush(opId) },
        },
      );
    }

    return currentState(rooms, code);
  }

  return failure('UNKNOWN_OP', 'Unbekannter Vorgang.');
}

export async function handleShoppingOperation(
  input: unknown,
): Promise<ShoppingApiResponse> {
  try {
    return await runOperation(input);
  } catch (error) {
    console.error('[shopping-store] Datenbankfehler:', error);

    if (error instanceof Error && error.message === 'MONGODB_URI_MISSING') {
      return failure(
        'SERVER_MISCONFIGURED',
        'Der Server ist noch nicht mit einer Datenbank verbunden.',
        500,
      );
    }

    return failure(
      'DB_UNAVAILABLE',
      'Der Server kann die Datenbank gerade nicht erreichen. Bitte in einem Moment erneut versuchen.',
      503,
    );
  }
}
